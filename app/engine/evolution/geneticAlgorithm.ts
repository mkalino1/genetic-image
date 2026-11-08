import { CANVAS_CONFIG, EVOLUTION_CONFIG } from '../config'
import type { CrossoverStrategy, EvolutionParams, FitnessMetric, ShapeMode } from '../config'
import { samplePopulationByRank } from './populationCreation'
import type { Individual, RankedIndividual } from './populationCreation'
import { FITNESS_ERROR_SCALE, weightedErrorFromFitness } from '../fitness/fitnessScoreConversion'
import { hillClimbIndividuals } from '../fitness/populationEvaluation'
import { FitnessWorkerPool } from '../fitness/fitnessWorkerPool'
import type {
  FitnessProfilingMetrics,
  GenerationProfilingMetrics,
  GenerationProfilingSummary
} from '../../web-workers/workerTypes'

const MAX_POPULATION_SAMPLES = 4

export class GeneticAlgorithm {
  // Onscreen canvas for rendering the current best individual
  displayCanvas: HTMLCanvasElement
  displayCtx: CanvasRenderingContext2D

  // Target image data
  targetImageData: ImageData
  
  // Worker pool for parallel fitness calculations
  workerPool: FitnessWorkerPool
  
  // Parameters
  populationSize: number
  mutationRate: number
  shapesPerIndividual: number
  crossoverStrategy: CrossoverStrategy
  enableHillClimbing: boolean
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
    this.enableHillClimbing = params.enableHillClimbing
    this.fitnessMetric = params.fitnessMetric
    this.shapeMode = params.shapeMode ?? EVOLUTION_CONFIG.defaults.shapeMode
    this.eliteSize = Math.max(
      1,
      Math.floor(this.populationSize * EVOLUTION_CONFIG.elitismPercentage)
    )

    // State
    this.population = initializePopulation(this.populationSize, this.shapesPerIndividual, this.shapeMode)
    this.populationSamples = []
    this.bestIndividual = null
    this.bestErrorMap = null
    this.bestFitness = 0
    this.generation = 0
    this.fitnessVariance = 0
    this.stagnationGenerations = 0
    this.bestFitnessAtLastProgress = 0

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

    if (
      this.enableHillClimbing &&
      this.eliteSize > 0 &&
      EVOLUTION_CONFIG.hillClimbing.attemptsPerElite > 0
    ) {
      const refinedElites = await hillClimbIndividuals(
        this.population.slice(0, this.eliteSize),
        EVOLUTION_CONFIG.hillClimbing.attemptsPerElite,
        this.targetImageData,
        this.workerPool,
        this.fitnessMetric
      )
      for (let index = 0; index < refinedElites.length; index++) {
        const refinedElite = refinedElites[index]
        if (refinedElite) {
          this.population[index] = refinedElite
        }
      }
      this.population.sort((a, b) => b.fitness - a.fitness)
    }
    this.populationSamples = samplePopulationByRank(this.population, MAX_POPULATION_SAMPLES)

    // Update best fitness and render best individual
    const best = this.population[0]
    if (best) {
      this.bestIndividual = best
      if (best.fitness > this.bestFitness) {
        this.bestFitness = best.fitness
      }
      const previousBestError = weightedErrorFromFitness(this.bestFitnessAtLastProgress)
      const currentBestError = weightedErrorFromFitness(best.fitness)
      const minimumErrorImprovement =
        EVOLUTION_CONFIG.stagnation.minimumNormalizedErrorImprovement *
        FITNESS_ERROR_SCALE
      if (
        previousBestError - currentBestError >= minimumErrorImprovement
      ) {
        this.bestFitnessAtLastProgress = best.fitness
        this.stagnationGenerations = 0
      } else {
        this.stagnationGenerations++
      }
    }
    if (best) {
      renderIndividual(best, this.displayCtx)
      this.bestErrorMap = await this.workerPool.calculateFitnessErrorMap(
        { individualId: 0, shapes: best.shapes },
        this.targetImageData,
        this.fitnessMetric
      )
    }
    
    this.fitnessVariance = this.calculateFitnessVariance()
    
    // Create new population through crossover and mutation
    const stagnation = EVOLUTION_CONFIG.stagnation
    const shouldTriggerCataclysm =
      this.stagnationGenerations >= stagnation.cataclysmInterval &&
      this.stagnationGenerations % stagnation.cataclysmInterval === 0
    const nextPopulation = shouldTriggerCataclysm
      ? createCataclysmGeneration(
          this.population,
          this.populationSize,
          this.eliteSize,
          stagnation.cataclysmMutationStepMultiplier
        )
      : createNewGeneration(
          this.population,
          this.populationSize,
          this.eliteSize,
          this.shapesPerIndividual,
          this.mutationRate,
          this.crossoverStrategy,
          this.bestFitness,
          this.shapeMode,
          this.bestErrorMap ?? undefined
        )

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

  private calculateFitnessVariance(): number {
    const fitnesses = this.population.map(ind => ind.fitness)
    const meanFitness = fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length
    const fitnessVariance = fitnesses.reduce((sum, fitness) => 
      sum + Math.pow(fitness - meanFitness, 2), 0) / fitnesses.length
    
    return fitnessVariance
  }

}