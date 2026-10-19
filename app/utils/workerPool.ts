import type { FitnessResult, FitnessTask, FitnessWorkerRequest, FitnessWorkerResponse } from '../workers/workerTypes'

export class WorkerPool {
  private workers: Worker[] = []
  private batchSize: number
  private initializedTarget: ImageData | null = null
  private targetInitialization: Promise<void> | null = null

  constructor(populationSize: number) {
    const optimalWorkerCount = Math.min(navigator.hardwareConcurrency || 8, 16)
    this.batchSize = Math.max(1, Math.ceil(populationSize / optimalWorkerCount))
    this.initializeWorkers(optimalWorkerCount)
  }

  private initializeWorkers(count: number): void {
    for (let i = 0; i < count; i++) {
      try {
        const worker = new Worker(new URL('../workers/fitnessWorker.ts', import.meta.url))
        this.workers.push(worker)
      } catch (error) {
        console.error(`Failed to initialize worker ${i}:`, error)
      }
    }
  }

  private sendMessageToWorker(worker: Worker, message: FitnessWorkerRequest): Promise<FitnessWorkerResponse> {
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timeout)
        worker.removeEventListener('message', handleMessage)
        worker.removeEventListener('error', handleError)
      }

      const timeout = setTimeout(() => {
        cleanup()
        reject(new Error('Worker timeout'))
      }, 30000)

      const handleMessage = (event: MessageEvent<FitnessWorkerResponse>) => {
        cleanup()
        if (event.data.success) {
          resolve(event.data)
        } else {
          reject(new Error(event.data.error))
        }
      }

      const handleError = (error: ErrorEvent) => {
        cleanup()
        reject(new Error(error.message))
      }

      worker.addEventListener('message', handleMessage)
      worker.addEventListener('error', handleError)

      try {
        worker.postMessage(message)
      } catch (error) {
        cleanup()
        reject(error)
      }
    })
  }

  private async initializeTarget(targetImageData: ImageData): Promise<void> {
    if (this.initializedTarget === targetImageData && this.targetInitialization) {
      return this.targetInitialization
    }

    this.targetInitialization = Promise.all(this.workers.map(async (worker) => {
      const response = await this.sendMessageToWorker(worker, {
        type: 'initialize_target',
        targetImageData
      })
      if (response.type !== 'target_initialized') {
        throw new Error('Worker did not acknowledge target image initialization')
      }
    })).then(() => {
      this.initializedTarget = targetImageData
    }).catch((error: unknown) => {
      this.targetInitialization = null
      throw error
    })

    return this.targetInitialization
  }

  async calculateFitnessBatches(individuals: FitnessTask[], targetImageData: ImageData): Promise<Map<number, number>> {
    if (this.workers.length === 0) {
      throw new Error('No fitness workers could be initialized')
    }

    await this.initializeTarget(targetImageData)

    const results = new Map<number, number>()
    const batchSize = Math.max(
      this.batchSize,
      Math.ceil(individuals.length / this.workers.length)
    )
    const batches: FitnessTask[][] = []
    for (let i = 0; i < individuals.length; i += batchSize) {
      batches.push(individuals.slice(i, i + batchSize))
    }

    const batchResponses = await Promise.all(batches.map(async (batch, index) => {
      const worker = this.workers[index % this.workers.length]
      if (!worker) {
        throw new Error(`No worker available for fitness batch ${index}`)
      }
      const response = await this.sendMessageToWorker(worker, {
        type: 'batch_fitness_calculation',
        batch
      })
      if (response.type !== 'batch_fitness_result') {
        throw new Error('Worker returned an unexpected response for fitness calculation')
      }
      return response.results
    }))

    for (const batchResult of batchResponses) {
      for (const result of batchResult) {
        results.set(result.individualId, result.fitness)
      }
    }

    return results
  }

  terminate(): void {
    for (const worker of this.workers) {
      worker.terminate()
    }
    this.workers = []
  }
}
