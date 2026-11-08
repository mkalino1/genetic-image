import { EVOLUTION_CONFIG } from '../config'
import type { ShapeMode } from '../config'

export interface Individual {
  shapes: Shape[]
  fitness: number
}

export interface RankedIndividual {
  individual: Individual
  rank: number
}

export function samplePopulationByRank(
  population: Individual[],
  maximumSamples: number
): RankedIndividual[] {
  const sampleCount = Math.min(Math.max(0, Math.floor(maximumSamples)), population.length)

  return Array.from({ length: sampleCount }, (_, index) => {
    const populationIndex = sampleCount <= 1
      ? 0
      : Math.round(index * (population.length - 1) / (sampleCount - 1))

    return {
      individual: population[populationIndex]!,
      rank: populationIndex + 1
    }
  })
}

export function createRandomIndividual(
  shapesPerIndividual: number,
  shapeMode: ShapeMode = EVOLUTION_CONFIG.defaults.shapeMode
): Individual {
  const shapes: Shape[] = []
  for (let i = 0; i < shapesPerIndividual; i++) {
    shapes.push(new Shape({ mode: shapeMode }))
  }
  return { shapes, fitness: 0 }
}

export function cloneIndividual(ind: Individual): Individual {
  return {
    shapes: ind.shapes.map(s => s.clone()),
    fitness: ind.fitness
  }
}

export function initializePopulation(
  populationSize: number,
  shapesPerIndividual: number,
  shapeMode: ShapeMode = EVOLUTION_CONFIG.defaults.shapeMode
): Individual[] {
  const population: Individual[] = []
  for (let i = 0; i < populationSize; i++) {
    const individual = createRandomIndividual(shapesPerIndividual, shapeMode)
    population.push(individual)
  }
  return population
} 