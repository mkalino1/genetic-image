import type { FitnessResult, FitnessWorkerRequest } from './workerTypes'
import { renderShape } from '../utils/rendering'

const LAB_DELTA = 6 / 29
const LAB_DELTA_CUBE = Math.pow(LAB_DELTA, 3)
const LAB_LINEAR_SCALE = 3 * LAB_DELTA * LAB_DELTA

let targetLab: Float64Array | null = null
let targetPixelCount = 0
let canvas: OffscreenCanvas | null = null
let fitnessCanvasContext: OffscreenCanvasRenderingContext2D | null = null

self.onmessage = function(e: MessageEvent<FitnessWorkerRequest>) {
  try {
    if (e.data.type === 'initialize_target') {
      canvas = new OffscreenCanvas(e.data.targetImageData.width, e.data.targetImageData.height)
      fitnessCanvasContext = canvas.getContext('2d', { willReadFrequently: true })
      if (!fitnessCanvasContext) {
        throw new Error('Could not initialize fitness worker canvas')
      }
      targetPixelCount = e.data.targetImageData.data.length / 4
      targetLab = convertImageToLab(e.data.targetImageData)
      self.postMessage({ type: 'target_initialized', success: true })
      return
    }

    if (!targetLab || !fitnessCanvasContext) {
      throw new Error('Fitness worker has not been initialized')
    }

    const initializedTargetLab = targetLab
    const workerContext = fitnessCanvasContext
    const results: FitnessResult[] = []
    for (const { shapes, individualId } of e.data.batch) {
      const sortedShapes = [...shapes].sort((a, b) => a.z - b.z)
      workerContext.clearRect(0, 0, workerContext.canvas.width, workerContext.canvas.height)
      for (const shape of sortedShapes) {
        renderShape(shape, workerContext)
      }
      const imageData = workerContext.getImageData(0, 0, workerContext.canvas.width, workerContext.canvas.height)
      results.push({
        individualId,
        fitness: calculateFitness(imageData, initializedTargetLab, targetPixelCount)
      })
    }
    self.postMessage({ type: 'batch_fitness_result', results, success: true })
  } catch (error) {
    console.error('Worker fitness calculation failed:', error)
    self.postMessage({
      type: 'worker_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    })
  }
}

function calculateFitness(imageData: ImageData, targetLab: Float64Array, pixelCount: number): number {
  const evolvedData = imageData.data
  let totalDeltaE = 0

  for (let pixel = 0, rgbaOffset = 0; pixel < pixelCount; pixel++, rgbaOffset += 4) {
    const evolvedR = evolvedData[rgbaOffset]
    const evolvedG = evolvedData[rgbaOffset + 1]
    const evolvedB = evolvedData[rgbaOffset + 2]
    const evolvedA = evolvedData[rgbaOffset + 3]
    const targetL = targetLab[pixel * 3]
    const targetA = targetLab[pixel * 3 + 1]
    const targetB = targetLab[pixel * 3 + 2]

    if (
      evolvedR === undefined || evolvedG === undefined || evolvedB === undefined || evolvedA === undefined ||
      targetL === undefined || targetA === undefined || targetB === undefined
    ) continue

    const rLinear = toLinearRgb(evolvedR)
    const gLinear = toLinearRgb(evolvedG)
    const bLinear = toLinearRgb(evolvedB)
    const x = rLinear * 0.4124 + gLinear * 0.3576 + bLinear * 0.1805
    const y = rLinear * 0.2126 + gLinear * 0.7152 + bLinear * 0.0722
    const z = rLinear * 0.0193 + gLinear * 0.1192 + bLinear * 0.9505
    const xNorm = x / 0.95047
    const yNorm = y
    const zNorm = z / 1.08883
    const fx = xNorm > LAB_DELTA_CUBE ? Math.pow(xNorm, 1 / 3) : xNorm / LAB_LINEAR_SCALE + 4 / 29
    const fy = yNorm > LAB_DELTA_CUBE ? Math.pow(yNorm, 1 / 3) : yNorm / LAB_LINEAR_SCALE + 4 / 29
    const fz = zNorm > LAB_DELTA_CUBE ? Math.pow(zNorm, 1 / 3) : zNorm / LAB_LINEAR_SCALE + 4 / 29
    const evolvedL = 116 * fy - 16
    const evolvedLabA = 500 * (fx - fy)
    const evolvedLabB = 200 * (fy - fz)

    totalDeltaE += Math.hypot(
      targetL - evolvedL,
      targetA - evolvedLabA,
      targetB - evolvedLabB
    )
  }

  const averageDeltaE = totalDeltaE / pixelCount
  return Math.max(0, 1 - (averageDeltaE / 100))
}

function convertImageToLab(imageData: ImageData): Float64Array {
  const data = imageData.data
  const labData = new Float64Array(data.length / 4 * 3)

  for (let pixel = 0, rgbaOffset = 0; rgbaOffset < data.length; pixel++, rgbaOffset += 4) {
    const r = data[rgbaOffset]
    const g = data[rgbaOffset + 1]
    const b = data[rgbaOffset + 2]
    if (r === undefined || g === undefined || b === undefined) continue

    const rLinear = toLinearRgb(r)
    const gLinear = toLinearRgb(g)
    const bLinear = toLinearRgb(b)
    const x = rLinear * 0.4124 + gLinear * 0.3576 + bLinear * 0.1805
    const y = rLinear * 0.2126 + gLinear * 0.7152 + bLinear * 0.0722
    const z = rLinear * 0.0193 + gLinear * 0.1192 + bLinear * 0.9505
    const xNorm = x / 0.95047
    const yNorm = y
    const zNorm = z / 1.08883
    const fx = xNorm > LAB_DELTA_CUBE ? Math.pow(xNorm, 1 / 3) : xNorm / LAB_LINEAR_SCALE + 4 / 29
    const fy = yNorm > LAB_DELTA_CUBE ? Math.pow(yNorm, 1 / 3) : yNorm / LAB_LINEAR_SCALE + 4 / 29
    const fz = zNorm > LAB_DELTA_CUBE ? Math.pow(zNorm, 1 / 3) : zNorm / LAB_LINEAR_SCALE + 4 / 29
    const labOffset = pixel * 3
    labData[labOffset] = 116 * fy - 16
    labData[labOffset + 1] = 500 * (fx - fy)
    labData[labOffset + 2] = 200 * (fy - fz)
  }

  return labData
}

function toLinearRgb(value: number): number {
  const normalized = value / 255
  return normalized > 0.04045
    ? Math.pow((normalized + 0.055) / 1.055, 2.4)
    : normalized / 12.92
}
