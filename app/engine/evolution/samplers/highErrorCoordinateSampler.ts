export type HighErrorCoordinate = { x: number; y: number }
export type HighErrorCoordinateSampler = () => HighErrorCoordinate | null

const ERROR_MAP_SAMPLE_BLOCK_SIZE = 10

export function createHighErrorCoordinateSampler(
  errorMap: Float32Array,
  width: number,
  height: number
): HighErrorCoordinateSampler {
  if (width <= 0 || height <= 0 || errorMap.length !== width * height) {
    throw new RangeError('Error map dimensions do not match the provided width and height')
  }

  const columns = Math.ceil(width / ERROR_MAP_SAMPLE_BLOCK_SIZE)
  const rows = Math.ceil(height / ERROR_MAP_SAMPLE_BLOCK_SIZE)
  const bins: Array<{ x: number; y: number; width: number; height: number; cumulativeWeight: number }> = []
  let totalWeight = 0

  for (let blockY = 0; blockY < rows; blockY++) {
    for (let blockX = 0; blockX < columns; blockX++) {
      const x = blockX * ERROR_MAP_SAMPLE_BLOCK_SIZE
      const y = blockY * ERROR_MAP_SAMPLE_BLOCK_SIZE
      const blockWidth = Math.min(ERROR_MAP_SAMPLE_BLOCK_SIZE, width - x)
      const blockHeight = Math.min(ERROR_MAP_SAMPLE_BLOCK_SIZE, height - y)
      let blockError = 0

      for (let row = y; row < y + blockHeight; row++) {
        for (let column = x; column < x + blockWidth; column++) {
          blockError += Math.max(0, errorMap[row * width + column] ?? 0)
        }
      }

      const averageError = blockError / (blockWidth * blockHeight)
      if (!Number.isFinite(averageError) || averageError <= 0) continue

      totalWeight += averageError
      bins.push({
        x,
        y,
        width: blockWidth,
        height: blockHeight,
        cumulativeWeight: totalWeight
      })
    }
  }

  if (totalWeight === 0) return () => null

  return () => {
    const selection = Math.random() * totalWeight
    const bin = bins.find(candidate => selection < candidate.cumulativeWeight)
    if (!bin) {
      throw new Error('Could not select an error-map region')
    }
    return {
      x: bin.x + Math.floor(Math.random() * bin.width),
      y: bin.y + Math.floor(Math.random() * bin.height)
    }
  }
}
