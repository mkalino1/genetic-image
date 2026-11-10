export type CrossoverStrategy = 'uniform' | 'single_point' | 'two_point' | 'randomized' | 'adaptive'
export type ShapeMode = 'fixed' | 'polygon'
export type FitnessMetric = 'deltaE' | 'rgbMeanSquared'

export interface EvolutionParams {
  populationSize: number
  mutationRate: number
  shapesPerIndividual: number
  crossoverStrategy: CrossoverStrategy
  enableHillClimbing: boolean
  fitnessMetric: FitnessMetric
  shapeMode?: ShapeMode
}

export const CANVAS_CONFIG = {
  worldSize: 150,
  displaySize: 300,
  exportSize: 1024
} as const

export const EVOLUTION_CONFIG = {
  defaults: {
    populationSize: 100,
    mutationRate: 0.1,
    shapesPerIndividual: 100,
    crossoverStrategy: 'uniform' as CrossoverStrategy,
    enableHillClimbing: true,
    fitnessMetric: 'deltaE' as FitnessMetric,
    shapeMode: 'polygon' as ShapeMode
  },
  parameterBounds: {
    populationSize: { min: 10, max: 1000 },
    mutationRate: { min: 0.01, max: 0.3, step: 0.01 },
    shapesPerIndividual: { min: 1, max: 300 }
  },
  elitismPercentage: 0.03,
  hillClimbing: {
    attemptsPerElite: 5
  },
  selection: {
    tournamentSize: 3
  },
  mutation: {
    bigJumpProbability: 0.05,
    bigJumpStepMultiplier: 5,
    shapeOperationProbabilities: {
      mutate: 0.98,
      replace: 0.02
    }
  },
  stagnation: {
    minimumNormalizedErrorImprovement: 0.005,
    cataclysmInterval: 800,
    cataclysmMutationStepMultiplier: 10
  },
  crossover: {
    availableStrategies: ['uniform', 'single_point', 'two_point', 'randomized', 'adaptive'] as CrossoverStrategy[],
    adaptiveLowFitnessThreshold: 0.92,
    adaptiveHighFitnessThreshold: 0.97,
    uniformParentProbability: 0.5,
    randomStrategies: ['uniform', 'single_point', 'two_point'] as CrossoverStrategy[]
  },
  profilingWindowSize: 20
} as const

export const SHAPE_CONFIG = {
  modes: ['polygon', 'fixed'] as ShapeMode[],
  minimumSizeFraction: 1 / 40,
  maximumSizeFraction: 20 / 40,
  mutationStepFraction: 1 / 40,
  initialAlphaMinimum: 0.05,
  initialAlphaRange: 0.95,
  minimumAlpha: 0.05,
  maximumAlpha: 1,
  maximumInitialDepth: 100,
  maximumInitialRotation: Math.PI * 2,
  types: ['circle', 'rectangle', 'triangle'] as const,
  polygon: {
    initialMinimumSides: 3,
    initialMaximumSides: 6,
    minimumSides: 3,
    maximumSides: 10,
    sideIncrementProbability: 0.5,
    initialAngleOffsetRange: 0.6,
    initialRadiusMultiplierMinimum: 0.6,
    initialRadiusMultiplierRange: 0.8,
    sideCountMutationProbability: 0.02,
    angleMutationStep: 0.12,
    radiusMutationStep: 0.08,
    minimumRadiusMultiplier: 0.2,
    maximumRadiusMultiplier: 2
  },
  fixedShapeTypeMutationProbability: 0.02,
  mutationSteps: {
    rotation: Math.PI * 0.2,
    alpha: 0.04,
    depth: 5,
    color: 20
  }
} as const

export const FITNESS_CONFIG = {
  pixelWeights: {
    minimum: 1,
    maximum: 2,
    edgeStrengthForMaximumWeight: 50
  }
} as const

export const WORKER_CONFIG = {
  fallbackCount: 8,
  maximumCount: 16,
  requestTimeoutMs: 30_000
} as const
