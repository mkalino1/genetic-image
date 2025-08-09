export type CrossoverStrategy = 'uniform' | 'single_point' | 'two_point'

export function createNewGeneration(
  population: Individual[],
  populationSize: number,
  eliteSize: number,
  shapesPerIndividual: number,
  mutationRate: number,
  crossoverStrategy: CrossoverStrategy = 'uniform'
): Individual[] {
  const newPopulation: Individual[] = []

  // Elitism: keep best individuals
  for (let i = 0; i < eliteSize && i < population.length; i++) {
    const indiv = population[i]
    if (indiv) {
      newPopulation.push(cloneIndividual(indiv))
    }
  }

  // Generate rest of population through crossover and mutation
  while (newPopulation.length < populationSize) {
    const parent1 = selectParent(population, shapesPerIndividual)
    const parent2 = selectParent(population, shapesPerIndividual)
    const child = crossover(parent1, parent2, shapesPerIndividual, crossoverStrategy)
    mutate(child, mutationRate)
    newPopulation.push(child)
  }

  return newPopulation
}

function selectParent(population: Individual[], shapesPerIndividual: number): Individual {
  // Tournament selection
  const tournamentSize = 3
  let best: Individual | null = null

  if (population.length === 0) {
    return createRandomIndividual(shapesPerIndividual)
  }

  for (let i = 0; i < tournamentSize; i++) {
    const randomIndex = Math.floor(Math.random() * population.length)
    const candidate = population[randomIndex]
    if (!candidate) continue
    if (!best || candidate.fitness > best.fitness) {
      best = candidate
    }
  }

  // Fallback: if best is still null, return a random individual
  if (!best) {
    return createRandomIndividual(shapesPerIndividual)
  }
  return best
}

function crossover(parent1: Individual, parent2: Individual, shapesPerIndividual: number, strategy: CrossoverStrategy): Individual { 
  switch (strategy) {
    case 'uniform':
      return uniformCrossover(parent1, parent2, shapesPerIndividual)
    case 'single_point':
      return singlePointCrossover(parent1, parent2, shapesPerIndividual)
    case 'two_point':
      return twoPointCrossover(parent1, parent2, shapesPerIndividual)
    default:
      return uniformCrossover(parent1, parent2, shapesPerIndividual)
  }
}

function uniformCrossover(parent1: Individual, parent2: Individual, shapesPerIndividual: number): Individual {
  const child: Individual = {
    shapes: [],
    fitness: 0
  }

  for (let i = 0; i < shapesPerIndividual; i++) {
    const shape1 = parent1.shapes[i] ?? new Shape()
    const shape2 = parent2.shapes[i] ?? new Shape()

    if (Math.random() < 0.5) {
      child.shapes.push(shape1.clone())
    } else {
      child.shapes.push(shape2.clone())
    }
  }

  return child
}

function singlePointCrossover(parent1: Individual, parent2: Individual, shapesPerIndividual: number): Individual {
  const crossoverPoint = Math.floor(Math.random() * shapesPerIndividual)
  const child: Individual = { shapes: [], fitness: 0 }
  
  for (let i = 0; i < shapesPerIndividual; i++) {
    const shape1 = parent1.shapes[i] ?? new Shape()
    const shape2 = parent2.shapes[i] ?? new Shape()
    
    if (i < crossoverPoint) {
      child.shapes.push(shape1.clone())
    } else {
      child.shapes.push(shape2.clone())
    }
  }
  
  return child
}

function twoPointCrossover(parent1: Individual, parent2: Individual, shapesPerIndividual: number): Individual {
  const point1 = Math.floor(Math.random() * shapesPerIndividual)
  const point2 = Math.floor(Math.random() * (shapesPerIndividual - point1)) + point1
  const child: Individual = { shapes: [], fitness: 0 }
  
  for (let i = 0; i < shapesPerIndividual; i++) {
    const shape1 = parent1.shapes[i] ?? new Shape()
    const shape2 = parent2.shapes[i] ?? new Shape()
    
    if (i < point1 || i >= point2) {
      child.shapes.push(shape1.clone())
    } else {
      child.shapes.push(shape2.clone())
    }
  }
  
  return child
}

function mutate(individual: Individual, mutationRate: number): void {
  for (const shape of individual.shapes) {
    if (Math.random() < mutationRate) {
      shape.mutate()
    }
  }
}