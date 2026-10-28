/// <reference types="vitest/globals" />

import { packFitnessTasks, unpackFitnessTasks } from '../../app/utils/fitnessTaskSerialization'
import type { FitnessTask } from '../../app/workers/workerTypes'

describe('fitness task serialization', () => {
  it('round-trips fixed shapes and polygons with up to 10 vertices', () => {
    const tasks: FitnessTask[] = [
      {
        individualId: 7,
        shapes: [
          {
            type: 'circle',
            numSides: 0,
            mode: 'fixed',
            x: 10.25,
            y: 20.5,
            width: 30,
            height: 40,
            rotation: 0.75,
            color: { r: 12, g: 34, b: 56 },
            alpha: 0.8,
            z: 90
          },
          {
            type: 'triangle',
            numSides: 10,
            mode: 'polygon',
            vertexAngleOffsets: Array.from({ length: 10 }, (_, index) => index / 20),
            vertexRadiusMults: Array.from({ length: 10 }, (_, index) => 0.5 + index / 10),
            x: 100,
            y: 200,
            width: 300,
            height: 400,
            rotation: 1.25,
            color: { r: 255, g: 128, b: 0 },
            alpha: 0.35,
            z: 12.5
          }
        ]
      },
      {
        individualId: 11,
        shapes: []
      }
    ]

    expect(unpackFitnessTasks(packFitnessTasks(tasks))).toEqual(tasks)
  })

  it('rejects invalid packed shape ranges', () => {
    const packed = packFitnessTasks([{ individualId: 1, shapes: [] }])
    packed.individuals[0]!.shapeCount = 1

    expect(() => unpackFitnessTasks(packed)).toThrow('Packed fitness task has an invalid shape range')
  })
})
