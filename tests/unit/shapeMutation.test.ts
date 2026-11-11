/// <reference types="vitest/globals" />

import { CANVAS_CONFIG, SHAPE_CONFIG } from '../../app/engine/config'
import { Shape } from '../../app/engine/evolution/shape'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('shape mutation', () => {
  it('uses a Gaussian delta while keeping the previous maximum mutation range', () => {
    const shape = new Shape({
      mode: 'fixed',
      type: 'circle',
      x: CANVAS_CONFIG.worldSize / 2,
      y: CANVAS_CONFIG.worldSize / 2,
      width: 100,
      height: 100,
      rotation: 0,
      color: { r: 0, g: 0, b: 0 },
      alpha: 1,
      z: 0
    })
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(Math.exp(-0.5))
      .mockReturnValueOnce(0)

    shape.mutate()

    const step = CANVAS_CONFIG.worldSize * SHAPE_CONFIG.mutationStepFraction
    expect(shape.x).toBeCloseTo(CANVAS_CONFIG.worldSize / 2 + step / 6)
  })

  it('caps an extreme Gaussian delta at the previous maximum range', () => {
    const shape = new Shape({
      mode: 'fixed',
      type: 'circle',
      x: CANVAS_CONFIG.worldSize / 2,
      y: CANVAS_CONFIG.worldSize / 2,
      width: 100,
      height: 100,
      rotation: 0,
      color: { r: 0, g: 0, b: 0 },
      alpha: 1,
      z: 0
    })
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(Number.EPSILON)
      .mockReturnValueOnce(0)

    shape.mutate()

    const step = CANVAS_CONFIG.worldSize * SHAPE_CONFIG.mutationStepFraction
    expect(shape.x).toBeCloseTo(CANVAS_CONFIG.worldSize / 2 + step / 2)
  })
})
