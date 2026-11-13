import { EVOLUTION_CONFIG } from '../config'
import type { CrossoverStrategy, EvolutionParams, FitnessMetric, ShapeMode } from '../config'
import { samplePopulationByRank } from './populationCreation'
import type { Individual, RankedIndividual } from './populationCreation'
import { FitnessWorkerPool } from '../fitness/fitnessWorkerPool'
import { calculateBackgroundColor, compositeImageData } from '../image/backgroundColor'
import { createOptimizer } from './optimizer/optimizerFactory'
import type { Optimizer } from './optimizer/optimizerFactory'
import type {
  FitnessProfilingMetrics,
  GenerationProfilingMetrics,
  GenerationProfilingSummary
} from '../../web-workers/workerTypes'
import type { EvolutionSnapshot } from './evolutionSnapshot'
import type { EvolutionSession } from './evolutionSession'
import type { TargetImageData } from './shapeCreation'

const MAX_POPULATION_SAMPLES = 4

export class EvolutionEngine implements EvolutionSession {
  // Target image data
  targetImageData: ImageData
  shapeTargetImageData: TargetImageData
  backgroundColor: string
  
  // Worker pool for parallel fitness calculations
  workerPool: FitnessWorkerPool
  
  // Parameters
  populationSize: number
  mutationRate: number
  shapesPerIndividual: number
  crossoverStrategy: CrossoverStrategy
  optimizer: Optimizer
  fitnessMetric: FitnessMetric
  shapeMode: ShapeMode
  eliteSize: number
  
  // State
  population: Individual[]
  populationSamples: RankedIndividual[]
  bestIndividual: Individual | null
  bestErrorMap: Float32Array | null
  bestFitness: number
  generation: number
  fitnessVariance: number
  profilingHistory: GenerationProfilingMetrics[] = []
  latestSnapshot: EvolutionSnapshot | null = null

  constructor(targetImageData: ImageData, params: EvolutionParams) {
    this.targetImageData = targetImageData
    const backgroundColor = calculateBackgroundColor(targetImageData)
    this.backgroundColor = `rgb(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b})`
    this.shapeTargetImageData = {
      width: targetImageData.width,
      height: targetImageData.height,
      data: compositeImageData(targetImageData, backgroundColor)
    }

    // Parameters
    this.populationSize = params.populationSize
    this.mutationRate = params.mutationRate
    this.shapesPerIndividual = params.shapesPerIndividual
    this.crossoverStrategy = params.crossoverStrategy
    this.optimizer = createOptimizer(params.optimizer)
    this.fitnessMetric = params.fitnessMetric
    this.shapeMode = params.shapeMode ?? EVOLUTION_CONFIG.defaults.shapeMode
    this.eliteSize = Math.max(
      1,
      Math.floor(this.populationSize * EVOLUTION_CONFIG.elitismPercentage)
    )

    // State
    this.population = initializePopulation(
      this.populationSize,
      this.shapesPerIndividual,
      this.shapeMode,
      this.shapeTargetImageData
    )
    this.populationSamples = []
    this.bestIndividual = null
    this.bestErrorMap = null
    this.bestFitness = 0
    this.generation = 0
    this.fitnessVariance = 0
    // Initialize worker pool for parallel fitness calculations
    this.workerPool = new FitnessWorkerPool()
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
      this.fitnessMetric,
      profilingEnabled ? (profile) => {
        workerProfile = profile
      } : undefined
    )

    // Sort by fitness (best first)
    this.population.sort((a, b) => b.fitness - a.fitness)
    this.population = this.population.slice(0, this.populationSize)

    const leadingIndividual = this.population[0]
    if (leadingIndividual) {
      this.bestErrorMap = await this.workerPool.calculateFitnessErrorMap(
        { individualId: 0, shapes: leadingIndividual.shapes },
        this.targetImageData,
        this.fitnessMetric
      )
    }

    const optimizerContext = {
      targetImageData: this.targetImageData,
      shapeTargetImageData: this.shapeTargetImageData,
      workerPool: this.workerPool,
      fitnessMetric: this.fitnessMetric,
      populationSize: this.populationSize,
      eliteSize: this.eliteSize,
      shapesPerIndividual: this.shapesPerIndividual,
      mutationRate: this.mutationRate,
      crossoverStrategy: this.crossoverStrategy,
      bestFitness: this.bestFitness,
      shapeMode: this.shapeMode,
      errorMap: this.bestErrorMap ?? undefined
    }
    this.population = await this.optimizer.refinePopulation(this.population, optimizerContext)
    this.populationSamples = samplePopulationByRank(this.population, MAX_POPULATION_SAMPLES)

    // Update best fitness
    const best = this.population[0]
    if (best) {
      this.bestIndividual = best
      if (best.fitness > this.bestFitness) {
        this.bestFitness = best.fitness
      }
    }
    optimizerContext.bestFitness = this.bestFitness
    
    this.fitnessVariance = this.calculateFitnessVariance()
    
    // Create new population through crossover and mutation
    this.population = this.optimizer.createNextGeneration(this.population, optimizerContext)

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
    this.latestSnapshot = {
      bestIndividual: this.bestIndividual,
      populationSamples: this.populationSamples,
      bestErrorMap: this.bestErrorMap,
      generation: this.generation,
      bestFitness: this.bestFitness,
      fitnessVariance: this.fitnessVariance,
      profiling: this.getAverageProfilingMetrics()
    }
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

  private calculateFitnessVariance(): number {
    const fitnesses = this.population.map(ind => ind.fitness)
    const meanFitness = fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length
    const fitnessVariance = fitnesses.reduce((sum, fitness) => 
      sum + Math.pow(fitness - meanFitness, 2), 0) / fitnesses.length
    
    return fitnessVariance
  }

}