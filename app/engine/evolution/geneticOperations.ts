import { CANVAS_CONFIG, EVOLUTION_CONFIG } from '../config'
import type { CrossoverStrategy, ShapeMode } from '../config'
import type { ShapeRenderData } from './shape'

export function createNewGeneration(
  population: Individual[],
  populationSize: number,
  eliteSize: number,
  shapesPerIndividual: number,
  mutationRate: number,
  crossoverStrategy: CrossoverStrategy,
  bestFitness: number,
  shapeMode: ShapeMode = EVOLUTION_CONFIG.defaults.shapeMode,
  errorMap?: Float32Array
): Individual[] {
  const newPopulation: Individual[] = []
  const errorMapSampler = errorMap
    ? createErrorMapSampler(errorMap, CANVAS_CONFIG.worldSize, CANVAS_CONFIG.worldSize)
    : undefined

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
    const child = crossover(
      parent1,
      parent2,
      shapesPerIndividual,
      crossoverStrategy,
      bestFitness
    )
    mutateIndividual(child, mutationRate, shapeMode, errorMapSampler)
    newPopulation.push(child)
  }

  return newPopulation
}

export function createCataclysmGeneration(
  population: Individual[],
  populationSize: number,
  eliteSize: number,
  mutationStepMultiplier: number
): Individual[] {
  const elites = population.slice(0, eliteSize)
  if (populationSize > 0 && elites.length === 0) {
    throw new Error('Cannot create a cataclysm generation without elites')
  }
  
  console.log('Creating cataclysm generation')
  const newPopulation = elites
    .slice(0, populationSize)
    .map(individual => cloneIndividual(individual))

  while (newPopulation.length < populationSize && elites.length > 0) {
    const source = elites[Math.floor(Math.random() * elites.length)]
    if (!source) continue

    const mutant: Individual = {
      shapes: source.shapes.map(shape => shape.clone()),
      fitness: 0
    }
    for (const shape of mutant.shapes) {
      shape.mutateAll(mutationStepMultiplier)
    }
    newPopulation.push(mutant)
  }

  return newPopulation
}

export function mutateOneShape(individual: Individual, sampleShapeIndex?: () => number): void {
  if (individual.shapes.length === 0) return

  const shapeIndex = sampleShapeIndex?.() ?? Math.floor(Math.random() * individual.shapes.length)
  individual.shapes[shapeIndex]?.mutate()
}

const ERROR_GUIDED_SHAPE_EXPLORATION_RATE = 0.2

export function createErrorWeightedShapeSampler(
  errorMap: Float32Array,
  shapes: ShapeRenderData[],
  width: number,
  height: number
): () => number {
  if (width <= 0 || height <= 0 || errorMap.length !== width * height) {
    throw new RangeError('Error map dimensions do not match the provided width and height')
  }
  if (shapes.length === 0) {
    throw new RangeError('Cannot sample a shape from an empty shape list')
  }

  const scores = shapes.map(shape => {
    const cosine = Math.abs(Math.cos(shape.rotation))
    const sine = Math.abs(Math.sin(shape.rotation))
    const radiusMultiplier = shape.mode === 'polygon'
      ? Math.max(1, ...(shape.vertexRadiusMults ?? [1]))
      : 1
    const halfWidth = shape.type === 'circle'
      ? Math.min(shape.width, shape.height) / 2
      : (cosine * shape.width + sine * shape.height) / 2 * radiusMultiplier
    const halfHeight = shape.type === 'circle'
      ? Math.min(shape.width, shape.height) / 2
      : (sine * shape.width + cosine * shape.height) / 2 * radiusMultiplier
    const left = Math.max(0, Math.floor(shape.x - halfWidth))
    const right = Math.min(width - 1, Math.ceil(shape.x + halfWidth))
    const top = Math.max(0, Math.floor(shape.y - halfHeight))
    const bottom = Math.min(height - 1, Math.ceil(shape.y + halfHeight))
    let totalError = 0
    let pixelCount = 0

    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) {
        const error = errorMap[y * width + x] ?? 0
        if (Number.isFinite(error)) totalError += Math.max(0, error)
        pixelCount++
      }
    }

    return pixelCount > 0 ? totalError / pixelCount : 0
  })
  const totalScore = scores.reduce((sum, score) => sum + score, 0)

  return () => {
    if (Math.random() < ERROR_GUIDED_SHAPE_EXPLORATION_RATE || totalScore <= 0) {
      return Math.floor(Math.random() * shapes.length)
    }

    const selection = Math.random() * totalScore
    let cumulativeScore = 0
    for (let index = 0; index < scores.length; index++) {
      cumulativeScore += scores[index] ?? 0
      if (selection < cumulativeScore) return index
    }
    return scores.length - 1
  }
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
  bestFitness: number
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
      return uniformCrossover(parent1, parent2, shapesPerIndividual)
    case 'single_point':
      return singlePointCrossover(parent1, parent2, shapesPerIndividual)
    case 'two_point':
      return twoPointCrossover(parent1, parent2, shapesPerIndividual)
    default:
      return uniformCrossover(parent1, parent2, shapesPerIndividual)
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
  shapesPerIndividual: number
): Individual {
  const child: Individual = {
    shapes: [],
    fitness: 0
  }

  for (let i = 0; i < shapesPerIndividual; i++) {
    const parent = Math.random() < EVOLUTION_CONFIG.crossover.uniformParentProbability
      ? parent1
      : parent2
    child.shapes.push(parent.shapes[i]!.clone())
  }

  return child
}

function singlePointCrossover(
  parent1: Individual,
  parent2: Individual,
  shapesPerIndividual: number
): Individual {
  const crossoverPoint = Math.floor(Math.random() * shapesPerIndividual)
  const child: Individual = { shapes: [], fitness: 0 }
  
  for (let i = 0; i < shapesPerIndividual; i++) {
    const parent = i >= crossoverPoint ? parent2 : parent1
    child.shapes.push(parent.shapes[i]!.clone())
  }
  
  return child
}

function twoPointCrossover(
  parent1: Individual,
  parent2: Individual,
  shapesPerIndividual: number
): Individual {
  const point1 = Math.floor(Math.random() * shapesPerIndividual)
  const point2 = Math.floor(Math.random() * (shapesPerIndividual - point1)) + point1
  const child: Individual = { shapes: [], fitness: 0 }
  
  for (let i = 0; i < shapesPerIndividual; i++) {
    const parent = i >= point1 && i < point2 ? parent2 : parent1
    child.shapes.push(parent.shapes[i]!.clone())
  }
  
  return child
}

export function mutateIndividual(
  individual: Individual,
  mutationRate: number,
  shapeMode: ShapeMode = EVOLUTION_CONFIG.defaults.shapeMode,
  errorMapSampler?: ErrorMapSampler
): void {
  const mutation = EVOLUTION_CONFIG.mutation
  const probabilities = mutation.shapeOperationProbabilities

  for (let index = 0; index < individual.shapes.length; index++) {
    if (Math.random() >= mutationRate) continue

    const operation = Math.random()
    if (operation < probabilities.mutate) {
      const stepMultiplier = Math.random() < mutation.bigJumpProbability
        ? mutation.bigJumpStepMultiplier
        : 1
      individual.shapes[index]?.mutate(stepMultiplier)
    } else {
      const position = errorMapSampler?.() ?? null
      individual.shapes[index] = new Shape({
        mode: shapeMode,
        ...(position ? { x: position.x, y: position.y } : {})
      })
    }
  }
}

type ErrorMapPosition = { x: number; y: number }
type ErrorMapSampler = () => ErrorMapPosition | null

const ERROR_MAP_SAMPLE_BLOCK_SIZE = 10

export function createErrorMapSampler(
  errorMap: Float32Array,
  width: number,
  height: number
): ErrorMapSampler {
  if (width <= 0 || height <= 0 || errorMap.length !== width * height) {
    throw new RangeError('Error map dimensions do not match the provided width and height')
  }

  const columns = Math.ceil(width / ERROR_MAP_SAMPLE_BLOCK_SIZE)
  const rows = Math.ceil(height / ERROR_MAP_SAMPLE_BLOCK_SIZE)
  const bins: Array<{ x: number; y: number; width: number; height: number; cumulativeWeight: number }> = []
  let totalWeight = 0

  for (let blockY = 0; blockY < rows; blockY++) {
    for (let blockX = 0; blockX < columns; blockX++) {
      const x = blockX * ERROR_MAP_SAMPLE_BLOCK_SIZE
      const y = blockY * ERROR_MAP_SAMPLE_BLOCK_SIZE
      const blockWidth = Math.min(ERROR_MAP_SAMPLE_BLOCK_SIZE, width - x)
      const blockHeight = Math.min(ERROR_MAP_SAMPLE_BLOCK_SIZE, height - y)
      let blockError = 0

      for (let row = y; row < y + blockHeight; row++) {
        for (let column = x; column < x + blockWidth; column++) {
          blockError += Math.max(0, errorMap[row * width + column] ?? 0)
        }
      }

      const averageError = blockError / (blockWidth * blockHeight)
      if (!Number.isFinite(averageError) || averageError <= 0) continue

      totalWeight += averageError
      bins.push({
        x,
        y,
        width: blockWidth,
        height: blockHeight,
        cumulativeWeight: totalWeight
      })
    }
  }

  if (totalWeight === 0) return () => null

  return () => {
    const selection = Math.random() * totalWeight
    const bin = bins.find(candidate => selection < candidate.cumulativeWeight)
    if (!bin) {
      throw new Error('Could not select an error-map region')
    }
    return {
      x: bin.x + Math.floor(Math.random() * bin.width),
      y: bin.y + Math.floor(Math.random() * bin.height)
    }
  }
}