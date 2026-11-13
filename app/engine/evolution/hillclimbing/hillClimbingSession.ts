import { EVOLUTION_CONFIG } from '../../config'
import type { EvolutionParams } from '../../config'
import type { Individual, RankedIndividual } from '../populationCreation'
import type { EvolutionSnapshot } from '../evolutionSnapshot'
import type { GenerationProfilingSummary, HillClimbingResponse } from '../../../web-workers/workerTypes'
import { Shape } from '../shape'
import type { HillClimbingRequest } from '../../../web-workers/workerTypes'
import { unpackFitnessTasks } from '../../fitness/fitnessTaskSerialization'
import { calculateBackgroundColor } from '../../image/backgroundColor'
import type { EvolutionSession } from '../evolutionSession'

export interface HillClimbingStats {
  steps: number
  accepted: number
  stepsPerSecond: number
  shapeCount: number
}

export class HillClimbingSession implements EvolutionSession {
  readonly backgroundColor: string
  latestSnapshot: EvolutionSnapshot | null = null
  stats: HillClimbingStats | null = null

  private readonly worker: Worker
  private snapshotVersion = 0
  private deliveredSnapshotVersion = 0
  private waiting: { resolve: () => void; reject: (error: Error) => void } | null = null
  private cleaned = false

  constructor(targetImageData: ImageData, params: EvolutionParams) {
    const background = calculateBackgroundColor(targetImageData)
    this.backgroundColor = `rgb(${background.r}, ${background.g}, ${background.b})`
    this.worker = new Worker(new URL('../../../web-workers/hillClimbingWorker.ts', import.meta.url), {
      type: 'module'
    })
    this.worker.onmessage = (event: MessageEvent<HillClimbingResponse>) => {
      if (event.data.type === 'worker_error') {
        this.waiting?.reject(new Error(event.data.error))
        this.waiting = null
        return
      }
      try {
        this.receiveSnapshot(event.data)
      } catch (error) {
        this.waiting?.reject(error instanceof Error ? error : new Error(String(error)))
        this.waiting = null
      }
    }
    this.worker.onerror = (event) => {
      this.waiting?.reject(new Error(event.message || 'Hill climbing worker failed'))
      this.waiting = null
    }

    const request: HillClimbingRequest = {
      type: 'init',
      targetImageData,
      metric: params.fitnessMetric,
      params: {
        maxShapes: params.shapesPerIndividual,
        shapeMode: params.shapeMode ?? EVOLUTION_CONFIG.defaults.shapeMode
      }
    }
    this.worker.postMessage(request)
    this.worker.postMessage({ type: 'start' } satisfies HillClimbingRequest)
  }

  evolve(): Promise<void> {
    if (this.snapshotVersion > this.deliveredSnapshotVersion) {
      this.deliveredSnapshotVersion = this.snapshotVersion
      return Promise.resolve()
    }
    if (this.cleaned) return Promise.reject(new Error('Hill climbing session has been cleaned up'))
    if (this.waiting) return Promise.reject(new Error('A hill climbing snapshot is already pending'))
    return new Promise<void>((resolve, reject) => {
      this.waiting = { resolve, reject }
    })
  }

  getAverageProfilingMetrics(): GenerationProfilingSummary | null {
    return null
  }

  cleanup(): void {
    if (this.cleaned) return
    this.cleaned = true
    this.worker.terminate()
    this.waiting?.reject(new Error('Hill climbing session was stopped'))
    this.waiting = null
  }

  private receiveSnapshot(response: Extract<HillClimbingResponse, { type: 'snapshot' }>): void {
    const [task] = unpackFitnessTasks(response.batch)
    if (!task || task.individualId !== 0) {
      throw new Error('Hill climbing worker returned an invalid fitness task')
    }
    const individual: Individual = {
      shapes: task.shapes.map(shape => new Shape(shape)),
      fitness: response.fitness
    }
    const populationSamples: RankedIndividual[] = [{ individual, rank: 1 }]
    this.stats = {
      steps: response.steps,
      accepted: response.accepted,
      stepsPerSecond: response.stepsPerSecond,
      shapeCount: response.shapeCount
    }
    if (response.errorMap) {
      this.bestErrorMap = response.errorMap
    }
    this.latestSnapshot = {
      bestIndividual: individual,
      populationSamples,
      bestErrorMap: this.bestErrorMap,
      generation: response.accepted,
      bestFitness: response.fitness,
      fitnessVariance: 0,
      profiling: null
    }
    this.snapshotVersion++
    this.waiting?.resolve()
    this.waiting = null
  }

  private bestErrorMap: Float32Array | null = null
}
