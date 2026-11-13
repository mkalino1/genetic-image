import { HILL_CLIMBING_CONFIG } from '../engine/config'
import { prepareFitnessTarget } from '../engine/fitness/fitnessTarget'
import { createPixelErrorFunction } from '../engine/fitness/metrics/errorFunctionFactory'
import { packFitnessTasks } from '../engine/fitness/fitnessTaskSerialization'
import { CanvasRegionRenderer } from '../engine/evolution/hillclimbing/canvasRegionRenderer'
import { HillClimber } from '../engine/evolution/hillclimbing/hillClimber'
import type { HillClimbingRequest, HillClimbingResponse } from './workerTypes'

let climber: HillClimber | null = null
let running = false
let lastSnapshotAt = 0
let lastSamplersAt = 0
let lastErrorMapAt = 0
let lastFullAt = 0
let stepsAtLastSnapshot = 0

const tick = new MessageChannel()
tick.port1.onmessage = runSlice

self.onmessage = (event: MessageEvent<HillClimbingRequest>) => {
  try {
    const message = event.data
    if (message.type === 'init') {
      const target = prepareFitnessTarget(message.targetImageData)
      const renderer = new CanvasRegionRenderer(target.width, target.height, target.backgroundCss)
      climber = new HillClimber(
        target,
        createPixelErrorFunction(message.metric, target),
        renderer.render.bind(renderer),
        message.params
      )
      return
    }

    if (message.type === 'start') {
      if (!climber) throw new Error('Hill climbing worker has not been initialized')
      if (!running) {
        running = true
        lastSnapshotAt = performance.now()
        lastSamplersAt = lastSnapshotAt
        lastErrorMapAt = lastSnapshotAt
        lastFullAt = lastSnapshotAt
        tick.port2.postMessage(null)
      }
      return
    }

    if (message.type === 'pause') {
      running = false
      return
    }

    if (!climber) throw new Error('Hill climbing worker has not been initialized')
    climber.setParams(message.params)
  } catch (error) {
    running = false
    postError(error)
  }
}

function runSlice(): void {
  if (!running || !climber) return

  try {
    const end = performance.now() + HILL_CLIMBING_CONFIG.sliceMs
    do {
      for (let step = 0; step < HILL_CLIMBING_CONFIG.stepsPerBatch; step++) {
        climber.step()
      }
    } while (performance.now() < end)

    const now = performance.now()
    if (now - lastSamplersAt > HILL_CLIMBING_CONFIG.samplerRefreshMs) {
      climber.refreshSamplers()
      lastSamplersAt = now
    }
    if (now - lastFullAt > HILL_CLIMBING_CONFIG.fullRecomputeMs) {
      climber.recomputeFull()
      lastFullAt = now
    }
    if (now - lastSnapshotAt > HILL_CLIMBING_CONFIG.snapshotIntervalMs) {
      postSnapshot(now)
    }
    tick.port2.postMessage(null)
  } catch (error) {
    running = false
    postError(error)
  }
}

function postSnapshot(now: number): void {
  if (!climber) return
  const batch = packFitnessTasks([{ individualId: 0, shapes: climber.shapes }])
  const includeErrorMap = now - lastErrorMapAt > HILL_CLIMBING_CONFIG.errorMapIntervalMs
  const errorMap = includeErrorMap ? Float32Array.from(climber.errorMap) : undefined
  const elapsedMs = now - lastSnapshotAt
  const stepsPerSecond = elapsedMs > 0
    ? (climber.steps - stepsAtLastSnapshot) / (elapsedMs / 1000)
    : 0
  stepsAtLastSnapshot = climber.steps
  lastSnapshotAt = now
  if (includeErrorMap) lastErrorMapAt = now

  const response: HillClimbingResponse = {
    type: 'snapshot',
    batch,
    fitness: climber.fitness,
    steps: climber.steps,
    accepted: climber.accepted,
    shapeCount: climber.shapes.length,
    stepsPerSecond,
    ...(errorMap ? { errorMap } : {})
  }
  self.postMessage(
    response,
    [batch.shapes, ...(errorMap ? [errorMap.buffer] : [])]
  )
}

function postError(error: unknown): void {
  const response: HillClimbingResponse = {
    type: 'worker_error',
    error: error instanceof Error ? error.message : String(error)
  }
  self.postMessage(response)
}
