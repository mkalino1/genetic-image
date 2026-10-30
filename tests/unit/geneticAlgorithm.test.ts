/// <reference types="vitest/globals" />

import type { Individual } from '../../app/utils/populationCreation'
import { CANVAS_CONFIG } from '../../app/utils/imageEvolutionConfig'
import { MAX_SHAPE_SIZE, MIN_SHAPE_SIZE } from '../../app/utils/shape'
import { hillClimbIndividuals } from '../../app/utils/imageEvaluationMultithread'

const WORLD_SIZE = CANVAS_CONFIG.worldSize

afterEach(() => {
  vi.restoreAllMocks()
})

function createIndividual(fitness: number, shapes: Shape[]): Individual {
  return { shapes, fitness }
}

function createShape(x: number): Shape {
  return new Shape({
    type: 'rectangle',
    mode: 'fixed',
    x,
    y: 20,
    width: 30,
    height: 40,
    rotation: 0.5,
    color: { r: 10, g: 20, b: 30 },
    alpha: 0.8,
    z: 50
  })
}

describe('population creation and cloning', () => {
  it('creates the requested number of individuals and shapes', () => {
    const population = initializePopulation(4, 3)

    expect(population).toHaveLength(4)
    for (const individual of population) {
      expect(individual.shapes).toHaveLength(3)
      expect(individual.fitness).toBe(0)
    }
  })

  it('creates polygons with matching vertex data', () => {
    const population = initializePopulation(5, 2, 'polygon')

    for (const individual of population) {
      for (const shape of individual.shapes) {
        expect(shape.mode).toBe('polygon')
        expect(shape.numSides).toBeGreaterThanOrEqual(3)
        expect(shape.numSides).toBeLessThanOrEqual(6)
        expect(shape.vertexAngleOffsets).toHaveLength(shape.numSides)
        expect(shape.vertexRadiusMults).toHaveLength(shape.numSides)
      }
    }
  })

  it('deep-clones shapes and their mutable data while preserving fitness', () => {
    const original = createIndividual(0.75, [
      new Shape({
        mode: 'polygon',
        numSides: 4,
        vertexAngleOffsets: [0.1, 0.2, 0.3, 0.4],
        vertexRadiusMults: [1, 1.1, 0.9, 0.8],
        color: { r: 10, g: 20, b: 30 }
      })
    ])

    const cloned = cloneIndividual(original)

    expect(cloned).not.toBe(original)
    expect(cloned.fitness).toBe(original.fitness)
    expect(cloned.shapes[0]).not.toBe(original.shapes[0])
    expect(cloned.shapes[0]).toMatchObject(original.shapes[0]!)
    expect(cloned.shapes[0]!.color).not.toBe(original.shapes[0]!.color)
    expect(cloned.shapes[0]!.vertexAngleOffsets).not.toBe(original.shapes[0]!.vertexAngleOffsets)
    expect(cloned.shapes[0]!.vertexRadiusMults).not.toBe(original.shapes[0]!.vertexRadiusMults)

    cloned.shapes[0]!.color.r = 200
    cloned.shapes[0]!.vertexRadiusMults![0] = 1.5
    expect(original.shapes[0]!.color.r).toBe(10)
    expect(original.shapes[0]!.vertexRadiusMults![0]).toBe(1)
  })
})

describe('shape mutation', () => {
  it('makes one bounded local change, including in the negative direction', () => {
    const shape = createShape(20)
    const originalShape = shape.clone()
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.999)
      .mockReturnValueOnce(0)
      .mockReturnValue(0)

    shape.mutate()

    expect(shape.x).toBeLessThan(originalShape.x)
    expect(originalShape.x - shape.x).toBeLessThanOrEqual(WORLD_SIZE / 80)
    expect(shape.y).toBe(originalShape.y)
    expect(shape.width).toBe(originalShape.width)
    expect(shape.height).toBe(originalShape.height)
    expect(shape.rotation).toBe(originalShape.rotation)
    expect(shape.alpha).toBe(originalShape.alpha)
    expect(shape.z).toBe(originalShape.z)
    expect(shape.color).toEqual(originalShape.color)
  })

  it('mutates only one polygon vertex parameter at a time', () => {
    const shape = new Shape({
      mode: 'polygon',
      numSides: 3,
      vertexAngleOffsets: [0, 0, 0],
      vertexRadiusMults: [1, 1, 1]
    })
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.999)
      .mockReturnValueOnce(0.999)
      .mockReturnValueOnce(0)
      .mockReturnValue(0.999)

    shape.mutate()

    expect(shape.vertexRadiusMults).toEqual([expect.closeTo(1.04, 2), 1, 1])
    expect(shape.vertexAngleOffsets).toEqual([0, 0, 0])
  })

  it('keeps dimensions, alpha, and colors within their lower bounds', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const shape = new Shape({
      type: 'rectangle',
      mode: 'fixed',
      width: 5,
      height: 5,
      alpha: 0.3,
      color: { r: 0, g: 0, b: 0 }
    })

    shape.mutate()

    expect(shape.width).toBeGreaterThanOrEqual(MIN_SHAPE_SIZE)
    expect(shape.height).toBeGreaterThanOrEqual(MIN_SHAPE_SIZE)
    expect(shape.alpha).toBeGreaterThanOrEqual(0.3)
    expect(shape.color.r).toBeGreaterThanOrEqual(0)
    expect(shape.color.g).toBeGreaterThanOrEqual(0)
    expect(shape.color.b).toBeGreaterThanOrEqual(0)
  })

  it('keeps alpha and colors within their upper bounds', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    const shape = new Shape({
      type: 'rectangle',
      mode: 'fixed',
      alpha: 1,
      color: { r: 255, g: 255, b: 255 }
    })

    shape.mutate()

    expect(shape.alpha).toBeLessThanOrEqual(1)
    expect(shape.color.r).toBeLessThanOrEqual(255)
    expect(shape.color.g).toBeLessThanOrEqual(255)
    expect(shape.color.b).toBeLessThanOrEqual(255)
  })

  it('keeps polygon vertex arrays aligned with the side count', () => {
    const shape = new Shape({
      mode: 'polygon',
      numSides: 3,
      vertexAngleOffsets: [0, 0, 0],
      vertexRadiusMults: [1, 1, 1]
    })
    vi.spyOn(Math, 'random').mockReturnValue(0)

    shape.mutate()

    expect(shape.numSides).toBeGreaterThanOrEqual(3)
    expect(shape.numSides).toBeLessThanOrEqual(10)
    expect(shape.vertexAngleOffsets).toHaveLength(shape.numSides)
    expect(shape.vertexRadiusMults).toHaveLength(shape.numSides)
    for (const radius of shape.vertexRadiusMults!) {
      expect(radius).toBeGreaterThanOrEqual(0.2)
      expect(radius).toBeLessThanOrEqual(2)
    }
  })

  it('keeps positions and dimensions within the world bounds', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    const shape = new Shape()

    expect(shape.x).toBeLessThanOrEqual(WORLD_SIZE)
    expect(shape.y).toBeLessThanOrEqual(WORLD_SIZE)
    expect(shape.width).toBeLessThanOrEqual(MAX_SHAPE_SIZE)
    expect(shape.height).toBeLessThanOrEqual(MAX_SHAPE_SIZE)

    shape.mutate()

    expect(shape.x).toBeLessThanOrEqual(WORLD_SIZE)
    expect(shape.y).toBeLessThanOrEqual(WORLD_SIZE)
    expect(shape.width).toBeLessThanOrEqual(MAX_SHAPE_SIZE)
    expect(shape.height).toBeLessThanOrEqual(MAX_SHAPE_SIZE)
  })

  it('clamps explicitly provided geometry to the world bounds', () => {
    const shape = new Shape({ x: 200, y: -10, width: 200, height: 0 })

    expect(shape.x).toBe(WORLD_SIZE)
    expect(shape.y).toBe(0)
    expect(shape.width).toBe(MAX_SHAPE_SIZE)
    expect(shape.height).toBe(MIN_SHAPE_SIZE)
  })
})

describe('next generation', () => {
  it('returns the configured population size with the requested shapes per individual', () => {
    const population = [
      createIndividual(0.9, [createShape(10), createShape(11)]),
      createIndividual(0.8, [createShape(20), createShape(21)]),
      createIndividual(0.7, [createShape(30), createShape(31)])
    ]

    const nextGeneration = createNewGeneration(population, 6, 1, 2, 0, 'uniform', 0.9)

    expect(nextGeneration).toHaveLength(6)
    for (const individual of nextGeneration) {
      expect(individual.shapes).toHaveLength(2)
    }
  })

  it('preserves elites as independent, unmutated copies', () => {
    const elite = createIndividual(0.95, [createShape(10), createShape(11)])
    const population = [elite, createIndividual(0.5, [createShape(20), createShape(21)])]

    const nextGeneration = createNewGeneration(population, 4, 1, 2, 1, 'single_point', 0.95)

    expect(nextGeneration[0]).not.toBe(elite)
    expect(nextGeneration[0]).toMatchObject(elite)
    expect(nextGeneration[0]!.shapes[0]).not.toBe(elite.shapes[0])

    nextGeneration[0]!.shapes[0]!.x = 999
    expect(elite.shapes[0]!.x).toBe(10)
  })
})

describe('population fitness evaluation', () => {
  it('assigns worker fitness results to the corresponding individuals', async () => {
    const population = [
      createIndividual(0, [createShape(10)]),
      createIndividual(0, [createShape(20)])
    ]
    const calculateFitnessBatches = vi.fn().mockResolvedValue(new Map([
      [0, 0.25],
      [1, 0.8]
    ]))
    const workerPool = { calculateFitnessBatches }
    const targetImageData = {} as ImageData

    await evaluatePopulation(population, targetImageData, workerPool)

    expect(population.map(individual => individual.fitness)).toEqual([0.25, 0.8])
    expect(calculateFitnessBatches).toHaveBeenCalledWith([
      { individualId: 0, shapes: population[0]!.shapes },
      { individualId: 1, shapes: population[1]!.shapes }
    ], targetImageData)
  })

  it('rejects when the worker omits a fitness result', async () => {
    const population = [createIndividual(0, [createShape(10)])]
    const workerPool = {
      calculateFitnessBatches: vi.fn().mockResolvedValue(new Map())
    }

    await expect(
      evaluatePopulation(population, {} as ImageData, workerPool)
    ).rejects.toThrow('Fitness result missing for individual 0')
  })
})

describe('hill climbing', () => {
  it('evaluates all mutations in one worker-pool call and keeps only improvements', async () => {
    const individual = createIndividual(0.5, [createShape(10), createShape(20)])
    const originalShapeX = individual.shapes[0]!.x
    const calculateFitnessBatches = vi.fn().mockResolvedValue(new Map([
      [0, 0.8],
      [1, 0.7]
    ]))
    const workerPool = { calculateFitnessBatches }

    const refined = await hillClimbIndividuals(
      [individual],
      2,
      {} as ImageData,
      workerPool
    )

    expect(calculateFitnessBatches).toHaveBeenCalledTimes(1)
    expect(calculateFitnessBatches.mock.calls[0]?.[0]).toHaveLength(2)
    expect(refined[0]!.fitness).toBe(0.8)
    expect(refined[0]).not.toBe(individual)
    expect(individual.fitness).toBe(0.5)
    expect(individual.shapes[0]!.x).toBe(originalShapeX)
  })

  it('does not replace an individual when a mutation is not better', async () => {
    const individual = createIndividual(0.8, [createShape(10)])
    const calculateFitnessBatches = vi.fn().mockResolvedValue(new Map([[0, 0.8]]))

    const refined = await hillClimbIndividuals(
      [individual],
      1,
      {} as ImageData,
      { calculateFitnessBatches }
    )

    expect(refined[0]!.fitness).toBe(0.8)
    expect(refined[0]!.shapes[0]).toMatchObject(individual.shapes[0]!)
  })
})
