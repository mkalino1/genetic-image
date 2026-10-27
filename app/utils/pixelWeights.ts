const MIN_PIXEL_WEIGHT = 1
const MAX_PIXEL_WEIGHT = 2
const EDGE_STRENGTH_FOR_MAX_WEIGHT = 50

export function calculatePixelWeights(targetLab: Float64Array, width: number, height: number): Float32Array {
  if (width <= 0 || height <= 0 || targetLab.length !== width * height * 3) {
    throw new RangeError('Target Lab data dimensions do not match the provided width and height')
  }

  const weights = new Float32Array(width * height)
  const sample = (x: number, y: number, channel: number): number => {
    const clampedX = Math.max(0, Math.min(width - 1, x))
    const clampedY = Math.max(0, Math.min(height - 1, y))
    return targetLab[(clampedY * width + clampedX) * 3 + channel] ?? 0
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let gradientMagnitudeSquared = 0

      for (let channel = 0; channel < 3; channel++) {
        const gradientX = (
          sample(x + 1, y - 1, channel) + 2 * sample(x + 1, y, channel) + sample(x + 1, y + 1, channel) -
          sample(x - 1, y - 1, channel) - 2 * sample(x - 1, y, channel) - sample(x - 1, y + 1, channel)
        ) / 4
        const gradientY = (
          sample(x - 1, y + 1, channel) + 2 * sample(x, y + 1, channel) + sample(x + 1, y + 1, channel) -
          sample(x - 1, y - 1, channel) - 2 * sample(x, y - 1, channel) - sample(x + 1, y - 1, channel)
        ) / 4

        gradientMagnitudeSquared += gradientX * gradientX + gradientY * gradientY
      }

      const edgeStrength = Math.sqrt(gradientMagnitudeSquared)
      const edgeWeight = Math.min(
        MAX_PIXEL_WEIGHT - MIN_PIXEL_WEIGHT,
        edgeStrength / EDGE_STRENGTH_FOR_MAX_WEIGHT
      )
      weights[y * width + x] = MIN_PIXEL_WEIGHT + edgeWeight
    }
  }

  return weights
}
