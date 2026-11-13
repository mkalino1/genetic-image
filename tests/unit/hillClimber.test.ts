/// <reference types="vitest/globals" />

import { HillClimber } from '../../app/engine/evolution/hillclimbing/hillClimber'
import type { FitnessTarget } from '../../app/engine/fitness/fitnessTarget'
import type { Region } from '../../app/engine/image/shapeGeometry'
import type { ShapeRenderData } from '../../app/engine/evolution/shape'

const width = 150
const height = 150
const target: FitnessTarget = {
  width,
  height,
  background: { r: 0, g: 0, b: 0 },
  backgroundCss: 'rgb(0, 0, 0)',
  rgb: new Uint8ClampedArray(width * height * 4),
  lab: new Float64Array(width * height * 3),
  weights: new Float32Array(width * height).fill(1),
  totalWeight: width * height
}

function renderSinglePixel(shapes: readonly ShapeRenderData[], region: Region): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(region.width * region.height * 4)
  if (shapes.length === 0 || 15 < region.x || 15 >= region.x + region.width ||
    15 < region.y || 15 >= region.y + region.height) {
    return pixels
  }

  const offset = ((15 - region.y) * region.width + 15 - region.x) * 4
  pixels[offset] = 255
  pixels[offset + 3] = 255
  return pixels
}

describe('HillClimber', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('maintains an error map and accepts an improving addition', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
    const pixelError = (r: number) => r === 255 ? 0 : 1
    const climber = new HillClimber(
      target,
      pixelError,
      renderSinglePixel,
      { maxShapes: 1, shapeMode: 'fixed' }
    )

    expect(climber.errorSum).toBe(width * height)
    climber.step()

    expect(climber.shapes).toHaveLength(1)
    expect(climber.accepted).toBe(1)
    expect(climber.errorMap[15 * width + 15]).toBe(0)
    expect(climber.errorMap[0]).toBe(1)
    expect(climber.errorSum).toBe(width * height - 1)

    climber.recomputeFull()
    expect(climber.errorMap[15 * width + 15]).toBe(0)
    expect(climber.errorSum).toBe(width * height - 1)
  })

  it('rejects additions that do not reduce the error', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
    const climber = new HillClimber(
      target,
      () => 1,
      renderSinglePixel,
      { maxShapes: 1, shapeMode: 'fixed' }
    )

    climber.step()

    expect(climber.shapes).toHaveLength(0)
    expect(climber.accepted).toBe(0)
    expect(climber.errorSum).toBe(width * height)
  })
})
