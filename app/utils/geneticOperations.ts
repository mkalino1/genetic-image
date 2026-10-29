import { EVOLUTION_CONFIG } from './imageEvolutionConfig'
import type { CrossoverStrategy, ShapeMode } from './imageEvolutionConfig'

export function createNewGeneration(
  population: Individual[],
  populationSize: number,
  eliteSize: number,
  shapesPerIndividual: number,
  mutationRate: number,
  crossoverStrategy: CrossoverStrategy,
  bestFitness: number,
  shapeMode: ShapeMode = EVOLUTION_CONFIG.defaults.shapeMode
): Individual[] {
  const newPopulation: Individual[] = []
  const stronglyMutatedStart = Math.max(
    eliteSize,
    populationSize - Math.ceil(
      populationSize * EVOLUTION_CONFIG.mutation.stronglyMutatedTailFraction
    )
  )
  const mutation = EVOLUTION_CONFIG.mutation
  const strongMutationRate = Math.min(
    mutation.maximumStrongMutationRate,
    Math.max(
      mutationRate + mutation.strongMutationIncrease,
      mutationRate * mutation.strongMutationMultiplier
    )
  )

  // Elitism: keep best individuals
  for (let i = 0; i < eliteSize && i < population.length; i++) {
    const indiv = population[i]
    if (indiv) {
      newPopulation.push(cloneIndividual(indiv))
    }
  }

  // Generate rest of population through crossover and mutation
  while (newPopulation.length < populationSize) {
    const parent1 = selectParent(population, shapesPerIndividual, shapeMode)
    const parent2 = selectParent(population, shapesPerIndividual, shapeMode)
    const child = crossover(parent1, parent2, shapesPerIndividual, crossoverStrategy, bestFitness, shapeMode)
    const childMutationRate = newPopulation.length >= stronglyMutatedStart
      ? strongMutationRate
      : mutationRate
    mutate(child, childMutationRate)
    newPopulation.push(child)
  }

  return newPopulation
}

function selectParent(
  population: Individual[],
  shapesPerIndividual: number,
  shapeMode: ShapeMode = EVOLUTION_CONFIG.defaults.shapeMode
): Individual {
  // Tournament selection
  const tournamentSize = EVOLUTION_CONFIG.selection.tournamentSize
  let best: Individual | null = null

  if (population.length === 0) {
    return createRandomIndividual(shapesPerIndividual, shapeMode)
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
    return createRandomIndividual(shapesPerIndividual, shapeMode)
  }
  return best
}

function crossover(
  parent1: Individual,
  parent2: Individual,
  shapesPerIndividual: number,
  strategy: CrossoverStrategy,
  bestFitness: number,
  shapeMode: ShapeMode = EVOLUTION_CONFIG.defaults.shapeMode
): Individual {
  // If randomized, pick a random strategy
  if (strategy === 'randomized') {
    const strategies = EVOLUTION_CONFIG.crossover.randomStrategies
    strategy = strategies[Math.floor(Math.random() * strategies.length)] as CrossoverStrategy
  }
  
  // If adaptive, choose strategy based on population fitness
  if (strategy === 'adaptive') {
    strategy = selectAdaptiveStrategy(bestFitness)
  }
  
  switch (strategy) {
    case 'uniform':
      return uniformCrossover(parent1, parent2, shapesPerIndividual, shapeMode)
    case 'single_point':
      return singlePointCrossover(parent1, parent2, shapesPerIndividual, shapeMode)
    case 'two_point':
      return twoPointCrossover(parent1, parent2, shapesPerIndividual, shapeMode)
    default:
      return uniformCrossover(parent1, parent2, shapesPerIndividual, shapeMode)
  }
}

function selectAdaptiveStrategy(bestFitness: number): CrossoverStrategy {
  // Strategy selection based on best fitness level
  if (bestFitness < EVOLUTION_CONFIG.crossover.adaptiveLowFitnessThreshold) {
    // Low best fitness: use uniform crossover for exploration
    return 'uniform'
  } else if (bestFitness > EVOLUTION_CONFIG.crossover.adaptiveHighFitnessThreshold) {
    // High best fitness: use single point for exploitation
    return 'single_point'
  } else {
    // Medium best fitness: use two point for balanced approach
    return 'two_point'
  }
}

function uniformCrossover(
  parent1: Individual,
  parent2: Individual,
  shapesPerIndividual: number,
  shapeMode: ShapeMode = EVOLUTION_CONFIG.defaults.shapeMode
): Individual {
  const child: Individual = {
    shapes: [],
    fitness: 0
  }

  for (let i = 0; i < shapesPerIndividual; i++) {
    const shape1 = parent1.shapes[i] ?? new Shape({ mode: shapeMode })
    const shape2 = parent2.shapes[i] ?? new Shape({ mode: shapeMode })

    if (Math.random() < EVOLUTION_CONFIG.crossover.uniformParentProbability) {
      child.shapes.push(shape1.clone())
    } else {
      child.shapes.push(shape2.clone())
    }
  }

  return child
}

function singlePointCrossover(
  parent1: Individual,
  parent2: Individual,
  shapesPerIndividual: number,
  shapeMode: ShapeMode = EVOLUTION_CONFIG.defaults.shapeMode
): Individual {
  const crossoverPoint = Math.floor(Math.random() * shapesPerIndividual)
  const child: Individual = { shapes: [], fitness: 0 }
  
  for (let i = 0; i < shapesPerIndividual; i++) {
    const shape1 = parent1.shapes[i] ?? new Shape({ mode: shapeMode })
    const shape2 = parent2.shapes[i] ?? new Shape({ mode: shapeMode })
    
    if (i < crossoverPoint) {
      child.shapes.push(shape1.clone())
    } else {
      child.shapes.push(shape2.clone())
    }
  }
  
  return child
}

function twoPointCrossover(
  parent1: Individual,
  parent2: Individual,
  shapesPerIndividual: number,
  shapeMode: ShapeMode = EVOLUTION_CONFIG.defaults.shapeMode
): Individual {
  const point1 = Math.floor(Math.random() * shapesPerIndividual)
  const point2 = Math.floor(Math.random() * (shapesPerIndividual - point1)) + point1
  const child: Individual = { shapes: [], fitness: 0 }
  
  for (let i = 0; i < shapesPerIndividual; i++) {
    const shape1 = parent1.shapes[i] ?? new Shape({ mode: shapeMode })
    const shape2 = parent2.shapes[i] ?? new Shape({ mode: shapeMode })
    
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