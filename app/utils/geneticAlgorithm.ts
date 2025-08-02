export interface EvolutionParams {
  populationSize: number
  mutationRate: number
  shapesPerIndividual: number
}

export class GeneticAlgorithm {
  // Onscreen and offscreen canvas for rendering
  displayCanvas: HTMLCanvasElement
  displayCtx: CanvasRenderingContext2D
  offscreenCtx: OffscreenCanvasRenderingContext2D

  // Target image data
  targetImageData: ImageData
  
  // Parameters
  populationSize: number
  mutationRate: number
  shapesPerIndividual: number
  eliteSize: number
  
  // State
  population: Individual[]
  bestFitness: number

  constructor(displayCanvas: HTMLCanvasElement, targetImageData: ImageData, params: Partial<EvolutionParams> = {}) {
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
    this.populationSize = params.populationSize ?? 50
    this.mutationRate = params.mutationRate ?? 0.1
    this.shapesPerIndividual = params.shapesPerIndividual ?? 20
    this.eliteSize = Math.max(1, Math.floor(this.populationSize * 0.1)) // Keep at least 1

    // State
    this.population = initializePopulation(this.populationSize, this.shapesPerIndividual)
    this.bestFitness = 0
  }

  evolve(): void {
    if (this.population.length === 0) return

    // Evaluate fitness for all individuals
    evaluatePopulation(this.population, this.displayCanvas, this.offscreenCtx, this.targetImageData)

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
    const adaptiveMutationRate = this.calculateAdaptiveMutationRate()

    // Create new population through crossover and mutation
    this.population = createNewGeneration(
      this.population,
      this.populationSize,
      this.eliteSize,
      this.shapesPerIndividual,
      adaptiveMutationRate
    )
    
    this.generation++
  }

  private ensureDiversity(): void {
    if (this.generation > 50 && this.generation % 30 === 0) {
      if (this.variance < 0.001) { // Low variance indicates low diversity
        console.log('Low diversity detected, injecting random individuals...')
        this.injectRandomIndividuals(0.2)
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
    const diversityFactor = Math.max(0.1, Math.min(2.0, 0.01 / (this.variance + 0.001)))
    const adaptiveRate = baseRate * diversityFactor
    
    // Add some randomness to prevent getting stuck
    const jitter = 0.1 * Math.random()
    const finalRate = Math.max(0.01, Math.min(0.5, adaptiveRate + jitter))
    
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