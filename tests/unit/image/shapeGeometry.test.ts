/// <reference types="vitest/globals" />

import { clipRegion, intersects, polygonLocalVertices, shapeBounds, unionRegion } from '../../../app/engine/image/shapeGeometry'
import type { ShapeRenderData } from '../../../app/engine/evolution/shape'

const shape: ShapeRenderData = {
  type: 'rectangle',
  numSides: 0,
  mode: 'fixed',
  x: 10,
  y: 20,
  width: 8,
  height: 4,
  rotation: 0,
  color: { r: 0, g: 0, b: 0 },
  alpha: 1,
  z: 0
}

describe('shape geometry', () => {
  it('calculates bounds with an antialiasing margin and clips to the canvas', () => {
    const bounds = shapeBounds(shape)
    expect(bounds).toEqual({ x: 5, y: 17, width: 10, height: 6 })
    expect(clipRegion(bounds, 8, 20)).toEqual({ x: 5, y: 17, width: 3, height: 3 })
  })

  it('unions and intersects regions', () => {
    expect(unionRegion(
      { x: 1, y: 2, width: 3, height: 4 },
      { x: 2, y: 0, width: 5, height: 3 }
    )).toEqual({ x: 1, y: 0, width: 6, height: 6 })
    expect(intersects(
      { x: 0, y: 0, width: 2, height: 2 },
      { x: 1, y: 1, width: 2, height: 2 }
    )).toBe(true)
  })

  it('exposes the same local vertices used to render polygons', () => {
    const vertices = polygonLocalVertices({
      ...shape,
      type: 'triangle',
      mode: 'polygon',
      numSides: 3,
      vertexAngleOffsets: [0, 0, 0],
      vertexRadiusMults: [1, 1, 1]
    })
    expect(vertices).toHaveLength(6)
    expect(vertices[0]).toBeCloseTo(shape.width / 2 * Math.cos(-Math.PI / 4))
    expect(vertices[1]).toBeCloseTo(shape.height / 2 * Math.sin(-Math.PI / 4))
  })
})
