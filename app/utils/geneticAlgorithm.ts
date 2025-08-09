export interface EvolutionParams {
  populationSize: number
  mutationRate: number
  shapesPerIndividual: number
  crossoverStrategy: CrossoverStrategy
}

export class GeneticAlgorithm {
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
  eliteSize: number
  
  // State
  population: Individual[]
  bestFitness: number
  generation: number
  variance: number
  adaptiveMutationRate: number

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
    this.eliteSize = Math.max(1, Math.floor(this.populationSize * 0.1)) // Keep at least 1

    // State
    this.population = initializePopulation(this.populationSize, this.shapesPerIndividual)
    this.bestFitness = 0
    this.generation = 0
    this.variance = 0
    this.adaptiveMutationRate = this.mutationRate

    // Initialize worker pool for parallel fitness calculations
    this.workerPool = new WorkerPool(this.populationSize)
  }

  async evolve(): Promise<void> {
    if (this.population.length === 0) return

    // Evaluate fitness for all individuals using Web Workers
    await evaluatePopulation(this.population, this.displayCanvas, this.offscreenCtx, this.targetImageData, this.workerPool)

    // Sort by fitness (best first)
    this.population.sort((a, b) => b.fitness - a.fitness)

    // Update best fitness and render best individual
    const best = this.population[0]
    if (best && best.fitness > this.bestFitness) {
      this.bestFitness = best.fitness
    }
    if (best) {
      renderIndividual(best, this.displayCtx)
    }
    
    this.variance = this.calculateVariance()
    
    // Inject random individuals if stagnation (low variance) detected
    this.ensureDiversity()

    // Calculate adaptive mutation rate based on population variance
    this.adaptiveMutationRate = this.calculateAdaptiveMutationRate()

    // Create new population through crossover and mutation
    this.population = createNewGeneration(
      this.population,
      this.populationSize,
      this.eliteSize,
      this.shapesPerIndividual,
      this.adaptiveMutationRate,
      this.crossoverStrategy
    )
    
    this.generation++
  }

  cleanup(): void {
    if (this.workerPool) {
      this.workerPool.terminate()
    }
  }

  private ensureDiversity(): void {
    if (this.generation > 50 && this.generation % 20 === 0) {
      if (this.variance < 0.001) { // Low variance indicates low diversity
        console.log('Low diversity detected, injecting random individuals...')
        this.injectRandomIndividuals(0.4)
      }
    }
  }

  private calculateVariance(): number {
    // Calculate population variance based on fitness
    const fitnesses = this.population.map(ind => ind.fitness)
    const meanFitness = fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length
    const variance = fitnesses.reduce((sum, fitness) => 
      sum + Math.pow(fitness - meanFitness, 2), 0) / fitnesses.length
    
    return variance
  }

  private calculateAdaptiveMutationRate(): number {
    // High variance = lower mutation rate (exploitation). Low variance = higher mutation rate (exploration)
    const baseRate = this.mutationRate
    const diversityFactor = Math.max(0.5, Math.min(1.5, 0.005 / (this.variance + 0.001)))
    const adaptiveRate = baseRate * diversityFactor
    
    // Add some randomness to prevent getting stuck
    const jitter = 0.05 * Math.random()
    const finalRate = Math.max(0.01, Math.min(0.3, adaptiveRate + jitter))
    
    return finalRate
  }

  private injectRandomIndividuals(percentage: number): void {
    const numToReplace = Math.floor(this.population.length * percentage)
    const startIndex = this.eliteSize
    
    for (let i = 0; i < numToReplace && startIndex + i < this.population.length; i++) {
      this.population[startIndex + i] = createRandomIndividual(this.shapesPerIndividual)
    }
  }
} 