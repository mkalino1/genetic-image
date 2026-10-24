import { DISPLAY_CANVAS_SIZE, WORLD_SIZE } from './canvasDimensions'
import type {
  FitnessProfilingMetrics,
  GenerationProfilingMetrics,
  GenerationProfilingSummary
} from '../workers/workerTypes'

export interface EvolutionParams {
  populationSize: number
  mutationRate: number
  shapesPerIndividual: number
  crossoverStrategy: CrossoverStrategy
  shapeMode?: 'fixed' | 'polygon'
}

export class GeneticAlgorithm {
  private static readonly PROFILING_WINDOW_SIZE = 20
  private static readonly STAGNATION_PATIENCE = 10
  private static readonly MINIMUM_FITNESS_IMPROVEMENT = 0.005
  private static readonly RANDOM_IMMIGRANT_PERCENTAGE = 0.4
  private static readonly ELITE_PERCENTAGE = 0.05

  // Onscreen canvas for rendering the current best individual
  displayCanvas: HTMLCanvasElement
  displayCtx: CanvasRenderingContext2D

  // Target image data
  targetImageData: ImageData
  
  // Worker pool for parallel fitness calculations
  workerPool: WorkerPool
  
  // Parameters
  populationSize: number
  mutationRate: number
  shapesPerIndividual: number
  crossoverStrategy: CrossoverStrategy
  shapeMode: 'fixed' | 'polygon'
  eliteSize: number
  
  // State
  population: Individual[]
  bestIndividual: Individual | null
  bestFitness: number
  generation: number
  variance: number
  adaptiveMutationRate: number
  stagnationGenerations: number
  bestFitnessAtLastProgress: number
  profilingHistory: GenerationProfilingMetrics[] = []

  constructor(displayCanvas: HTMLCanvasElement, targetImageData: ImageData, params: EvolutionParams) {
    this.displayCanvas = displayCanvas
    const displayCtx = displayCanvas.getContext('2d', { willReadFrequently: true })
    if (!displayCtx) throw new Error('Could not get 2D context')
    this.displayCtx = displayCtx
    this.displayCtx.setTransform(DISPLAY_CANVAS_SIZE / WORLD_SIZE, 0, 0, DISPLAY_CANVAS_SIZE / WORLD_SIZE, 0, 0)
    this.targetImageData = targetImageData

    // Parameters
    this.populationSize = params.populationSize
    this.mutationRate = params.mutationRate
    this.shapesPerIndividual = params.shapesPerIndividual
    this.crossoverStrategy = params.crossoverStrategy
    this.shapeMode = params.shapeMode ?? 'fixed'
    this.eliteSize = Math.max(1, Math.floor(this.populationSize * GeneticAlgorithm.ELITE_PERCENTAGE))

    // State
    this.population = initializePopulation(this.populationSize, this.shapesPerIndividual, this.shapeMode)
    this.bestIndividual = null
    this.bestFitness = 0
    this.generation = 0
    this.variance = 0
    this.adaptiveMutationRate = this.mutationRate
    this.stagnationGenerations = 0
    this.bestFitnessAtLastProgress = 0

    // Initialize worker pool for parallel fitness calculations
    this.workerPool = new WorkerPool(this.populationSize)
  }

  async evolve(): Promise<void> {
    if (this.population.length === 0) return

    const profilingEnabled = import.meta.dev &&
      this.profilingHistory.length < GeneticAlgorithm.PROFILING_WINDOW_SIZE
    const generationStartedAt = profilingEnabled ? performance.now() : 0
    let workerProfile: FitnessProfilingMetrics | undefined

    // Evaluate fitness for all individuals using Web Workers
    await evaluatePopulation(
      this.population,
      this.targetImageData,
      this.workerPool,
      profilingEnabled ? (profile) => {
        workerProfile = profile
      } : undefined
    )

    // Sort by fitness (best first)
    this.population.sort((a, b) => b.fitness - a.fitness)
    this.population = this.population.slice(0, this.populationSize)

    // Update best fitness and render best individual
    const best = this.population[0]
    if (best) {
      this.bestIndividual = best
      if (best.fitness > this.bestFitness) {
        this.bestFitness = best.fitness
      }
      if (best.fitness > this.bestFitnessAtLastProgress + GeneticAlgorithm.MINIMUM_FITNESS_IMPROVEMENT) {
        this.bestFitnessAtLastProgress = best.fitness
        this.stagnationGenerations = 0
      } else {
        this.stagnationGenerations++
      }
    }
    if (best) {
      renderIndividual(best, this.displayCtx)
    }
    
    this.variance = this.calculateVariance()
    
    // Increase exploration when the best fitness has stopped improving.
    this.adaptiveMutationRate = this.calculateAdaptiveMutationRate(this.stagnationGenerations)

    // Create new population through crossover and mutation
    const nextPopulation = createNewGeneration(
      this.population,
      this.populationSize,
      this.eliteSize,
      this.shapesPerIndividual,
      this.adaptiveMutationRate,
      this.crossoverStrategy,
      this.bestFitness,
      this.shapeMode
    )

    if (this.shouldInjectForLowVariance()) {
      const immigrantCount = Math.floor(this.populationSize * GeneticAlgorithm.RANDOM_IMMIGRANT_PERCENTAGE)
      for (let i = 0; i < immigrantCount; i++) {
        nextPopulation.push(createRandomIndividual(this.shapesPerIndividual, this.shapeMode))
      }
      console.log(`Added ${immigrantCount} random individuals at generation ${this.generation}`)
    }
    this.population = nextPopulation

    if (profilingEnabled && workerProfile) {
      const profile: GenerationProfilingMetrics = {
        generationMs: performance.now() - generationStartedAt,
        workerEvaluationWallMs: workerProfile.workerEvaluationWallMs,
        evaluatedIndividuals: workerProfile.evaluatedIndividuals,
        sortingMs: workerProfile.sortingMs,
        renderingMs: workerProfile.renderingMs,
        getImageDataMs: workerProfile.getImageDataMs,
        fitnessMs: workerProfile.fitnessMs
      }
      this.profilingHistory.push(profile)
    }

    this.generation++
  }

  getAverageProfilingMetrics(): GenerationProfilingSummary | null {
    if (this.profilingHistory.length === 0) return null

    const totals = this.profilingHistory.reduce<GenerationProfilingMetrics>((sum, profile) => ({
      generationMs: sum.generationMs + profile.generationMs,
      workerEvaluationWallMs: sum.workerEvaluationWallMs + profile.workerEvaluationWallMs,
      evaluatedIndividuals: sum.evaluatedIndividuals + profile.evaluatedIndividuals,
      sortingMs: sum.sortingMs + profile.sortingMs,
      renderingMs: sum.renderingMs + profile.renderingMs,
      getImageDataMs: sum.getImageDataMs + profile.getImageDataMs,
      fitnessMs: sum.fitnessMs + profile.fitnessMs
    }), {
      generationMs: 0,
      workerEvaluationWallMs: 0,
      evaluatedIndividuals: 0,
      sortingMs: 0,
      renderingMs: 0,
      getImageDataMs: 0,
      fitnessMs: 0
    })

    const sampleCount = this.profilingHistory.length
    return {
      metrics: {
        generationMs: totals.generationMs / sampleCount,
        workerEvaluationWallMs: totals.workerEvaluationWallMs / sampleCount,
        evaluatedIndividuals: totals.evaluatedIndividuals / sampleCount,
        sortingMs: totals.sortingMs / sampleCount,
        renderingMs: totals.renderingMs / sampleCount,
        getImageDataMs: totals.getImageDataMs / sampleCount,
        fitnessMs: totals.fitnessMs / sampleCount
      },
      sampleCount,
      totalGenerationMs: totals.generationMs
    }
  }

  cleanup(): void {
    if (this.workerPool) {
      this.workerPool.terminate()
    }
  }

  private shouldInjectForLowVariance(): boolean {
    return this.generation > 20 &&
      this.generation % 20 === 0 &&
      this.variance < 0.001
  }

  private calculateVariance(): number {
    // Calculate population variance based on fitness
    const fitnesses = this.population.map(ind => ind.fitness)
    const meanFitness = fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length
    const variance = fitnesses.reduce((sum, fitness) => 
      sum + Math.pow(fitness - meanFitness, 2), 0) / fitnesses.length
    
    return variance
  }

  private calculateAdaptiveMutationRate(stagnationGenerations: number): number {
    // High variance = lower mutation rate (exploitation). Low variance = higher mutation rate (exploration)
    const baseRate = this.mutationRate
    const diversityFactor = Math.max(0.5, Math.min(1.5, 0.005 / (this.variance + 0.001)))
    const adaptiveRate = baseRate * diversityFactor
    
    const stagnationFactor = Math.min(
      1.5,
      1 + stagnationGenerations / (2 * GeneticAlgorithm.STAGNATION_PATIENCE)
    )
    const jitter = adaptiveRate * 0.1 * Math.random()
    const finalRate = Math.max(0.01, Math.min(0.3, adaptiveRate * stagnationFactor + jitter))
    
    return finalRate
  }

}