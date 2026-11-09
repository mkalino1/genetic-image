import type { ShapeRenderData } from '../shape'

const ERROR_GUIDED_SHAPE_EXPLORATION_RATE = 0.2

export function createHighErrorOverlappingShapeSampler(
  errorMap: Float32Array,
  shapes: ShapeRenderData[],
  width: number,
  height: number
): () => number {
  if (width <= 0 || height <= 0 || errorMap.length !== width * height) {
    throw new RangeError('Error map dimensions do not match the provided width and height')
  }
  if (shapes.length === 0) {
    throw new RangeError('Cannot sample a shape from an empty shape list')
  }

  const scores = shapes.map(shape => {
    const cosine = Math.abs(Math.cos(shape.rotation))
    const sine = Math.abs(Math.sin(shape.rotation))
    const radiusMultiplier = shape.mode === 'polygon'
      ? Math.max(1, ...(shape.vertexRadiusMults ?? [1]))
      : 1
    const halfWidth = shape.type === 'circle'
      ? Math.min(shape.width, shape.height) / 2
      : (cosine * shape.width + sine * shape.height) / 2 * radiusMultiplier
    const halfHeight = shape.type === 'circle'
      ? Math.min(shape.width, shape.height) / 2
      : (sine * shape.width + cosine * shape.height) / 2 * radiusMultiplier
    const left = Math.max(0, Math.floor(shape.x - halfWidth))
    const right = Math.min(width - 1, Math.ceil(shape.x + halfWidth))
    const top = Math.max(0, Math.floor(shape.y - halfHeight))
    const bottom = Math.min(height - 1, Math.ceil(shape.y + halfHeight))
    let totalError = 0
    let pixelCount = 0

    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) {
        const error = errorMap[y * width + x] ?? 0
        if (Number.isFinite(error)) totalError += Math.max(0, error)
        pixelCount++
      }
    }

    return pixelCount > 0 ? totalError / pixelCount : 0
  })
  const totalScore = scores.reduce((sum, score) => sum + score, 0)

  return () => {
    if (Math.random() < ERROR_GUIDED_SHAPE_EXPLORATION_RATE || totalScore <= 0) {
      return Math.floor(Math.random() * shapes.length)
    }

    const selection = Math.random() * totalScore
    let cumulativeScore = 0
    for (let index = 0; index < scores.length; index++) {
      cumulativeScore += scores[index] ?? 0
      if (selection < cumulativeScore) return index
    }
    return scores.length - 1
  }
}
