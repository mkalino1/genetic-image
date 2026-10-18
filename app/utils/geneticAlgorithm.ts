export interface EvolutionParams {
  populationSize: number
  mutationRate: number
  shapesPerIndividual: number
  crossoverStrategy: CrossoverStrategy
  shapeMode?: 'fixed' | 'polygon'
}

export class GeneticAlgorithm {
  private static readonly STAGNATION_PATIENCE = 10
  private static readonly MINIMUM_FITNESS_IMPROVEMENT = 0.005
  private static readonly RANDOM_IMMIGRANT_PERCENTAGE = 0.4

  // Onscreen and offscreen canvas for rendering
  displayCanvas: HTMLCanvasElement
  displayCtx: CanvasRenderingContext2D
  offscreenCtx: OffscreenCanvasRenderingContext2D

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
  bestFitness: number
  generation: number
  variance: number
  adaptiveMutationRate: number
  stagnationGenerations: number
  bestFitnessAtLastProgress: number

  constructor(displayCanvas: HTMLCanvasElement, targetImageData: ImageData, params: EvolutionParams) {
    this.displayCanvas = displayCanvas
    const displayCtx = displayCanvas.getContext('2d', { willReadFrequently: true })
    if (!displayCtx) throw new Error('Could not get 2D context')
    this.displayCtx = displayCtx
    this.targetImageData = targetImageData

    // Initialize offscreen canvas
    const offscreenCanvas = new OffscreenCanvas(displayCanvas.width, displayCanvas.height)
    this.offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true })!
    if (!this.offscreenCtx) throw new Error('Could not get offscreen 2D context')

    // Parameters
    this.populationSize = params.populationSize
    this.mutationRate = params.mutationRate
    this.shapesPerIndividual = params.shapesPerIndividual
    this.crossoverStrategy = params.crossoverStrategy
    this.shapeMode = params.shapeMode ?? 'fixed'
    this.eliteSize = Math.max(1, Math.floor(this.populationSize * 0.1)) // Keep at least 1

    // State
    this.population = initializePopulation(this.populationSize, this.shapesPerIndividual, this.shapeMode)
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

    // Evaluate fitness for all individuals using Web Workers
    await evaluatePopulation(this.population, this.displayCanvas, this.offscreenCtx, this.targetImageData, this.workerPool)

    // Sort by fitness (best first)
    this.population.sort((a, b) => b.fitness - a.fitness)
    this.population = this.population.slice(0, this.populationSize)

    // Update best fitness and render best individual
    const best = this.population[0]
    if (best) {
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
    
    this.generation++
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
      1 + stagnationGenerations / GeneticAlgorithm.STAGNATION_PATIENCE
    )
    const jitter = 0.05 * Math.random()
    const finalRate = Math.max(0.01, Math.min(0.5, adaptiveRate * stagnationFactor + jitter))
    
    return finalRate
  }

}