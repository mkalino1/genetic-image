import { CANVAS_CONFIG, EVOLUTION_CONFIG } from './imageEvolutionConfig'
import type { CrossoverStrategy, EvolutionParams, ShapeMode } from './imageEvolutionConfig'
import { averageDeltaEFromFitness } from './fitnessConversion'
import type {
  FitnessProfilingMetrics,
  GenerationProfilingMetrics,
  GenerationProfilingSummary
} from '../workers/workerTypes'

export class GeneticAlgorithm {
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
  shapeMode: ShapeMode
  eliteSize: number
  
  // State
  population: Individual[]
  bestIndividual: Individual | null
  bestFitness: number
  generation: number
  fitnessVariance: number
  adaptiveMutationRate: number
  stagnationGenerations: number
  bestFitnessAtLastProgress: number
  profilingHistory: GenerationProfilingMetrics[] = []

  constructor(displayCanvas: HTMLCanvasElement, targetImageData: ImageData, params: EvolutionParams) {
    this.displayCanvas = displayCanvas
    const displayCtx = displayCanvas.getContext('2d', { willReadFrequently: true })
    if (!displayCtx) throw new Error('Could not get 2D context')
    this.displayCtx = displayCtx
    this.displayCtx.setTransform(
      CANVAS_CONFIG.displaySize / CANVAS_CONFIG.worldSize,
      0,
      0,
      CANVAS_CONFIG.displaySize / CANVAS_CONFIG.worldSize,
      0,
      0
    )
    this.targetImageData = targetImageData

    // Parameters
    this.populationSize = params.populationSize
    this.mutationRate = params.mutationRate
    this.shapesPerIndividual = params.shapesPerIndividual
    this.crossoverStrategy = params.crossoverStrategy
    this.shapeMode = params.shapeMode ?? EVOLUTION_CONFIG.defaults.shapeMode
    this.eliteSize = Math.max(
      1,
      Math.floor(this.populationSize * EVOLUTION_CONFIG.elitismPercentage)
    )

    // State
    this.population = initializePopulation(this.populationSize, this.shapesPerIndividual, this.shapeMode)
    this.bestIndividual = null
    this.bestFitness = 0
    this.generation = 0
    this.fitnessVariance = 0
    this.adaptiveMutationRate = this.mutationRate
    this.stagnationGenerations = 0
    this.bestFitnessAtLastProgress = 0

    // Initialize worker pool for parallel fitness calculations
    this.workerPool = new WorkerPool(this.populationSize)
  }

  async evolve(): Promise<void> {
    if (this.population.length === 0) return

    const profilingEnabled = import.meta.dev &&
      this.profilingHistory.length < EVOLUTION_CONFIG.profilingWindowSize
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
      const previousBestDeltaE = averageDeltaEFromFitness(this.bestFitnessAtLastProgress)
      const currentBestDeltaE = averageDeltaEFromFitness(best.fitness)
      if (
        previousBestDeltaE - currentBestDeltaE >=
        EVOLUTION_CONFIG.stagnation.minimumDeltaEImprovement
      ) {
        this.bestFitnessAtLastProgress = best.fitness
        this.stagnationGenerations = 0
      } else {
        this.stagnationGenerations++
      }
    }
    if (best) {
      renderIndividual(best, this.displayCtx)
    }
    
    this.fitnessVariance = this.calculateFitnessVariance()
    
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

    if (this.shouldInjectForLowFitnessVariance()) {
      const immigrantCount = Math.floor(
        this.populationSize * EVOLUTION_CONFIG.diversityRecovery.randomImmigrantFraction
      )
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

  private shouldInjectForLowFitnessVariance(): boolean {
    const recovery = EVOLUTION_CONFIG.diversityRecovery
    return this.generation >= recovery.firstGeneration &&
      this.generation % recovery.generationInterval === 0 &&
      this.fitnessVariance < recovery.minimumFitnessVariance
  }

  private calculateFitnessVariance(): number {
    const fitnesses = this.population.map(ind => ind.fitness)
    const meanFitness = fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length
    const fitnessVariance = fitnesses.reduce((sum, fitness) => 
      sum + Math.pow(fitness - meanFitness, 2), 0) / fitnesses.length
    
    return fitnessVariance
  }

  private calculateAdaptiveMutationRate(stagnationGenerations: number): number {
    // Higher fitness variance favors exploitation; lower variance favors exploration.
    const baseRate = this.mutationRate
    const mutation = EVOLUTION_CONFIG.mutation
    const varianceFactor = Math.max(
      mutation.minimumVarianceFactor,
      Math.min(
        mutation.maximumVarianceFactor,
        mutation.varianceTarget / (this.fitnessVariance + mutation.varianceOffset)
      )
    )
    const adaptiveRate = baseRate * varianceFactor
    
    const stagnationFactor = Math.min(
      mutation.maximumStagnationFactor,
      1 + stagnationGenerations / (
        mutation.stagnationFactorDivisor * EVOLUTION_CONFIG.stagnation.patience
      )
    )
    const jitter = adaptiveRate * mutation.randomJitterFraction * Math.random()
    const finalRate = Math.max(
      mutation.minimumRate,
      Math.min(mutation.maximumRate, adaptiveRate * stagnationFactor + jitter)
    )
    
    return finalRate
  }

}