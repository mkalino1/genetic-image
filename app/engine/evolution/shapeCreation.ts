import { CANVAS_CONFIG } from '../config'
import type { ShapeMode } from '../config'
import { Shape } from './shape'
import type { HighErrorCoordinate } from './samplers/highErrorCoordinateSampler'

export type TargetImageData = Pick<ImageData, 'width' | 'height' | 'data'>

export function createShapeForTarget(
  shapeMode: ShapeMode,
  targetImageData?: TargetImageData,
  position?: HighErrorCoordinate
): Shape {
  const shape = new Shape({
    mode: shapeMode,
    ...(position ? { x: position.x, y: position.y } : {})
  })

  if (!targetImageData) return shape

  const { width, height, data } = targetImageData
  if (width <= 0 || height <= 0 || data.length !== width * height * 4) {
    throw new RangeError('Target image dimensions do not match its pixel data')
  }

  const pixelX = Math.min(
    width - 1,
    Math.floor(shape.x / CANVAS_CONFIG.worldSize * width)
  )
  const pixelY = Math.min(
    height - 1,
    Math.floor(shape.y / CANVAS_CONFIG.worldSize * height)
  )
  const pixelOffset = (pixelY * width + pixelX) * 4
  shape.color = {
    r: data[pixelOffset]!,
    g: data[pixelOffset + 1]!,
    b: data[pixelOffset + 2]!
  }

  return shape
}
