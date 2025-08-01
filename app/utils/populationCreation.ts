export interface Individual {
  shapes: Shape[]
  fitness: number
}

export function createRandomIndividual(shapesPerIndividual: number): Individual {
  const shapes: Shape[] = []
  for (let i = 0; i < shapesPerIndividual; i++) {
    shapes.push(new Shape())
  }
  return { shapes, fitness: 0 }
}

export function cloneIndividual(ind: Individual): Individual {
  return {
    shapes: ind.shapes.map(s => s.clone()),
    fitness: ind.fitness
  }
}

export function initializePopulation(populationSize: number, shapesPerIndividual: number): Individual[] {
  const population: Individual[] = []
  for (let i = 0; i < populationSize; i++) {
    const individual = createRandomIndividual(shapesPerIndividual)
    population.push(individual)
  }
  return population
} 