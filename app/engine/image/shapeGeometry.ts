import type { ShapeRenderData } from '../evolution/shape'

export interface Region {
  x: number
  y: number
  width: number
  height: number
}

export function polygonLocalVertices(shape: ShapeRenderData): Float64Array {
  const vertices = new Float64Array(shape.numSides * 2)
  const baseAngle = -Math.PI / 4
  for (let i = 0; i < shape.numSides; i++) {
    const angle = baseAngle + (i / shape.numSides) * Math.PI * 2 +
      (shape.vertexAngleOffsets?.[i] || 0)
    const radius = shape.vertexRadiusMults?.[i] || 1
    vertices[i * 2] = shape.width / 2 * radius * Math.cos(angle)
    vertices[i * 2 + 1] = shape.height / 2 * radius * Math.sin(angle)
  }
  return vertices
}

export function shapeBounds(shape: ShapeRenderData): Region {
  if (shape.type === 'circle' && shape.mode !== 'polygon') {
    const radius = Math.min(shape.width, shape.height) / 2
    return {
      x: Math.floor(shape.x - radius) - 1,
      y: Math.floor(shape.y - radius) - 1,
      width: Math.ceil(shape.x + radius) + 1 - (Math.floor(shape.x - radius) - 1),
      height: Math.ceil(shape.y + radius) + 1 - (Math.floor(shape.y - radius) - 1)
    }
  }

  let vertices: Float64Array
  if (shape.mode === 'polygon') {
    vertices = polygonLocalVertices(shape)
  } else if (shape.type === 'triangle') {
    vertices = new Float64Array([
      0, -shape.height / 2,
      -shape.width / 2, shape.height / 2,
      shape.width / 2, shape.height / 2
    ])
  } else {
    vertices = new Float64Array([
      -shape.width / 2, -shape.height / 2,
      shape.width / 2, -shape.height / 2,
      shape.width / 2, shape.height / 2,
      -shape.width / 2, shape.height / 2
    ])
  }

  const cosine = Math.cos(shape.rotation)
  const sine = Math.sin(shape.rotation)
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  for (let i = 0; i < vertices.length; i += 2) {
    const localX = vertices[i]!
    const localY = vertices[i + 1]!
    const x = shape.x + localX * cosine - localY * sine
    const y = shape.y + localX * sine + localY * cosine
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }

  const x = Math.floor(minX) - 1
  const y = Math.floor(minY) - 1
  return {
    x,
    y,
    width: Math.ceil(maxX) + 1 - x,
    height: Math.ceil(maxY) + 1 - y
  }
}

export function unionRegion(a: Region, b: Region): Region {
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  const right = Math.max(a.x + a.width, b.x + b.width)
  const bottom = Math.max(a.y + a.height, b.y + b.height)
  return { x, y, width: right - x, height: bottom - y }
}

export function clipRegion(region: Region, width: number, height: number): Region | null {
  const left = Math.max(0, region.x)
  const top = Math.max(0, region.y)
  const right = Math.min(width, region.x + region.width)
  const bottom = Math.min(height, region.y + region.height)
  if (right <= left || bottom <= top) return null
  return { x: left, y: top, width: right - left, height: bottom - top }
}

export function intersects(a: Region, b: Region): boolean {
  return a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
}
