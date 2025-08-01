export interface EvolutionParams {
  populationSize: number
  mutationRate: number
  shapesPerIndividual: number
}

export class GeneticAlgorithm {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  targetImageData: ImageData
  populationSize: number
  mutationRate: number
  shapesPerIndividual: number
  eliteSize: number
  population: Individual[]
  bestFitness: number

  constructor(canvas: HTMLCanvasElement, targetImageData: ImageData, params: Partial<EvolutionParams> = {}) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('Could not get 2D context')
    this.ctx = ctx
    this.targetImageData = targetImageData

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
    evaluatePopulation(this.population, this.canvas, this.ctx, this.targetImageData)

    // Sort by fitness (best first)
    this.population.sort((a, b) => b.fitness - a.fitness)

    // Update best fitness and render best individual
    const best = this.population[0]
    if (best && best.fitness > this.bestFitness) {
      this.bestFitness = best.fitness
    }
    if (best) {
      renderIndividual(best, this.ctx)
    }
    
    // Check for stagnation and inject randomness if needed
    this.ensureDiversity()

    // Create new population through crossover and mutation
    this.population = createNewGeneration(
      this.population,
      this.populationSize,
      this.eliteSize,
      this.shapesPerIndividual,
      this.mutationRate
    )
    
    this.generation++
  }

  private ensureDiversity(): void {
    if (this.generation > 50 && this.generation % 20 === 0) {
      // Simple diversity check based on fitness variance
      const fitnesses = this.population.map(ind => ind.fitness)
      const meanFitness = fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length
      const variance = fitnesses.reduce((sum, fitness) => sum + Math.pow(fitness - meanFitness, 2), 0) / fitnesses.length
      
      if (variance < 0.003) { // Low variance indicates low diversity
        console.log('Low diversity detected, injecting random individuals...')
        this.injectRandomIndividuals(0.4)
      }
    }
  }

  private injectRandomIndividuals(percentage: number): void {
    const numToReplace = Math.floor(this.population.length * percentage)
    const startIndex = this.eliteSize
    
    for (let i = 0; i < numToReplace && startIndex + i < this.population.length; i++) {
      this.population[startIndex + i] = createRandomIndividual(this.shapesPerIndividual)
    }
  }
} 