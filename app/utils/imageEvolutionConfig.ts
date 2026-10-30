export type CrossoverStrategy = 'uniform' | 'single_point' | 'two_point' | 'randomized' | 'adaptive'
export type ShapeMode = 'fixed' | 'polygon'

export interface EvolutionParams {
  populationSize: number
  mutationRate: number
  shapesPerIndividual: number
  crossoverStrategy: CrossoverStrategy
  shapeMode?: ShapeMode
}

export const CANVAS_CONFIG = {
  worldSize: 150,
  displaySize: 300,
  exportSize: 512
} as const

export const EVOLUTION_CONFIG = {
  defaults: {
    populationSize: 200,
    mutationRate: 0.05,
    shapesPerIndividual: 120,
    crossoverStrategy: 'uniform' as CrossoverStrategy,
    shapeMode: 'polygon' as ShapeMode
  },
  parameterBounds: {
    populationSize: { min: 10, max: 1000 },
    mutationRate: { min: 0.01, max: 0.3, step: 0.01 },
    shapesPerIndividual: { min: 1, max: 300 }
  },
  elitismPercentage: 0.05,
  hillClimbing: {
    attemptsPerElite: 5
  },
  selection: {
    tournamentSize: 3
  },
  mutation: {
    stronglyMutatedTailFraction: 0.1,
    strongMutationIncrease: 0.1,
    strongMutationMultiplier: 2,
    maximumStrongMutationRate: 0.7,
    varianceTarget: 0.005,
    varianceOffset: 0.001,
    minimumVarianceFactor: 0.5,
    maximumVarianceFactor: 1.5,
    maximumStagnationFactor: 1.5,
    stagnationFactorDivisor: 2,
    randomJitterFraction: 0.1,
    minimumRate: 0.01,
    maximumRate: 0.3
  },
  stagnation: {
    patience: 10,
    minimumDeltaEImprovement: 0.5
  },
  diversityRecovery: {
    firstGeneration: 21,
    generationInterval: 20,
    minimumFitnessVariance: 0.001,
    randomImmigrantFraction: 0.4
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
  initialAlphaMinimum: 0.3,
  initialAlphaRange: 0.7,
  minimumAlpha: 0.3,
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
  deltaEScale: 100,
  deltaEPower: 1.25,
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
