/// <reference types="vitest/globals" />

import { Shape } from '../../app/engine/evolution/shape'
import { renderCanvasBackground, renderShape } from '../../app/engine/image/shapeRendering'

function renderPolygonPoints(shape: Shape) {
  const context = {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn()
  }

  renderShape(shape, context as unknown as CanvasRenderingContext2D)

  return [...context.moveTo.mock.calls, ...context.lineTo.mock.calls]
}

describe('polygon rendering', () => {
  it('scales a four-sided polygon by both dimensions without a radius boost', () => {
    const points = renderPolygonPoints(new Shape({
      mode: 'polygon',
      numSides: 4,
      width: 70,
      height: 20,
      vertexAngleOffsets: [0, 0, 0, 0],
      vertexRadiusMults: [1, 1, 1, 1]
    }))

    const xCoordinates = points.map(([x]) => x)
    const yCoordinates = points.map(([, y]) => y)
    expect(Math.max(...xCoordinates!) - Math.min(...xCoordinates!)).toBeCloseTo(70 / Math.sqrt(2))
    expect(Math.max(...yCoordinates!) - Math.min(...yCoordinates!)).toBeCloseTo(20 / Math.sqrt(2))
  })

  it('allows other polygon types to stretch along either dimension', () => {
    const points = renderPolygonPoints(new Shape({
      mode: 'polygon',
      numSides: 3,
      width: 70,
      height: 20,
      vertexAngleOffsets: [0, 0, 0],
      vertexRadiusMults: [1, 1, 1]
    }))

    const xCoordinates = points.map(([x]) => x)
    const yCoordinates = points.map(([, y]) => y)
    expect(Math.max(...xCoordinates!) - Math.min(...xCoordinates!)).toBeGreaterThan(
      Math.max(...yCoordinates!) - Math.min(...yCoordinates!)
    )
  })
})

describe('canvas background rendering', () => {
  it('paints the background across the full canvas without retaining the previous image', () => {
    const context = {
      canvas: { width: 32, height: 24 },
      fillStyle: '',
      save: vi.fn(),
      restore: vi.fn(),
      setTransform: vi.fn(),
      clearRect: vi.fn(),
      fillRect: vi.fn()
    }

    renderCanvasBackground(context as unknown as CanvasRenderingContext2D, 'rgb(12, 34, 56)')

    expect(context.clearRect).toHaveBeenCalledWith(0, 0, 32, 24)
    expect(context.fillStyle).toBe('rgb(12, 34, 56)')
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 32, 24)
    expect(context.restore).toHaveBeenCalledOnce()
  })
})
