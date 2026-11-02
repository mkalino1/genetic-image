import type { FitnessWorkerProfilingMetrics, FitnessResult, FitnessWorkerRequest } from './workerTypes'
import { renderShape } from '../engine/image/shapeRendering'
import { CANVAS_CONFIG } from '../engine/config'
import { calculateEdgeDetectionWeights } from '../engine/fitness/edgeDetectionWeights'
import { unpackFitnessTasks } from '../engine/fitness/fitnessTaskSerialization'
import type { FitnessMetric } from '../engine/config'
import { calculateDeltaEFitness, convertImageToLab } from '../engine/fitness/metrics/deltaE'
import { calculateRgbMeanSquaredFitness } from '../engine/fitness/metrics/rgbMeanSquared'
let targetLab: Float64Array | null = null
let targetRgb: Uint8ClampedArray | null = null
let targetPixelWeights: Float32Array | null = null
let targetPixelCount = 0
let canvas: OffscreenCanvas | null = null
let fitnessCanvasContext: OffscreenCanvasRenderingContext2D | null = null

self.onmessage = function(e: MessageEvent<FitnessWorkerRequest>) {
  try {
    if (e.data.type === 'initialize_target') {
      canvas = new OffscreenCanvas(
        CANVAS_CONFIG.worldSize,
        CANVAS_CONFIG.worldSize
      )
      fitnessCanvasContext = canvas.getContext('2d', { willReadFrequently: true })
      if (!fitnessCanvasContext) {
        throw new Error('Could not initialize fitness worker canvas')
      }
      targetPixelCount = e.data.targetImageData.data.length / 4
      targetRgb = e.data.targetImageData.data
      targetLab = convertImageToLab(e.data.targetImageData)
      targetPixelWeights = calculateEdgeDetectionWeights(
        targetLab,
        e.data.targetImageData.width,
        e.data.targetImageData.height
      )
      self.postMessage({ type: 'target_initialized', success: true })
      return
    }

    if (!targetLab || !targetRgb || !targetPixelWeights || !fitnessCanvasContext) {
      throw new Error('Fitness worker has not been initialized')
    }

    const initializedTargetLab = targetLab
    const initializedTargetRgb = targetRgb
    const initializedTargetPixelWeights = targetPixelWeights
    const workerContext = fitnessCanvasContext
    const results: FitnessResult[] = []
    const profiling = e.data.profile
      ? {
          evaluatedIndividuals: 0,
          sortingMs: 0,
          renderingMs: 0,
          getImageDataMs: 0,
          fitnessMs: 0
        } satisfies FitnessWorkerProfilingMetrics
      : undefined

    const tasks = unpackFitnessTasks(e.data.batch)

    for (const { shapes, individualId } of tasks) {
      const sortingStartedAt = profiling ? performance.now() : 0
      const sortedShapes = [...shapes].sort((a, b) => a.z - b.z)
      if (profiling) profiling.sortingMs += performance.now() - sortingStartedAt

      const renderingStartedAt = profiling ? performance.now() : 0
      workerContext.clearRect(0, 0, workerContext.canvas.width, workerContext.canvas.height)
      for (const shape of sortedShapes) {
        renderShape(shape, workerContext)
      }
      if (profiling) profiling.renderingMs += performance.now() - renderingStartedAt

      const imageReadStartedAt = profiling ? performance.now() : 0
      const imageData = workerContext.getImageData(0, 0, workerContext.canvas.width, workerContext.canvas.height)
      if (profiling) profiling.getImageDataMs += performance.now() - imageReadStartedAt

      const fitnessStartedAt = profiling ? performance.now() : 0
      results.push({
        individualId,
        fitness: calculateFitness(
          imageData,
          initializedTargetLab,
          initializedTargetRgb,
          initializedTargetPixelWeights,
          targetPixelCount,
          e.data.metric
        )
      })
      if (profiling) {
        profiling.fitnessMs += performance.now() - fitnessStartedAt
        profiling.evaluatedIndividuals++
      }
    }
    self.postMessage({ type: 'batch_fitness_result', results, profile: profiling, success: true })
  } catch (error) {
    console.error('Worker fitness calculation failed:', error)
    self.postMessage({
      type: 'worker_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    })
  }
}

function calculateFitness(
  imageData: ImageData,
  targetLab: Float64Array,
  targetRgb: Uint8ClampedArray,
  pixelWeights: Float32Array,
  pixelCount: number,
  metric: FitnessMetric
): number {
  if (metric === 'rgbMeanSquared') {
    return calculateRgbMeanSquaredFitness(
      imageData.data,
      targetRgb,
      pixelWeights,
      pixelCount
    )
  }
  return calculateDeltaEFitness(
    imageData.data,
    targetLab,
    pixelWeights,
    pixelCount
  )
}
