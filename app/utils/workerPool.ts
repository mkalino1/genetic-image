import type { FitnessTask, FitnessResult } from '../workers/workerTypes'

export class WorkerPool {
  private workers: Worker[] = []
  private batchSize: number

  constructor(populationSize: number) {
    // Use optimal worker count based on CPU cores
    const optimalWorkerCount = Math.min(navigator.hardwareConcurrency || 8, 16)
    // Calculate batch size to ensure even distribution
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

  private sendMessageToWorker(worker: Worker, message: {type: string, batch: FitnessTask[], targetImageData: ImageData}): Promise<FitnessResult[]> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Worker timeout')), 30000)
      
      const cleanup = () => {
        clearTimeout(timeout)
        worker.removeEventListener('message', handleMessage)
        worker.removeEventListener('error', handleError)
      }
      
      const handleMessage = (e: MessageEvent) => {
        cleanup()
        if (e.data.success) {
          resolve(e.data.results)
        } else {
          reject(new Error(e.data.error))
        }
      }
      
      const handleError = (error: ErrorEvent) => {
        cleanup()
        reject(new Error(error.message))
      }
      
      worker.addEventListener('message', handleMessage)
      worker.addEventListener('error', handleError)
      worker.postMessage(message)
    })
  }

  async calculateFitnessBatches(individuals: FitnessTask[], targetImageData: ImageData): Promise<Map<number, number>> {
    const results = new Map<number, number>()
    
    // Create batches - handle any population size
    const batches: FitnessTask[][] = []
    for (let i = 0; i < individuals.length; i += this.batchSize) {
      const batch = individuals.slice(i, i + this.batchSize)
      if (batch.length > 0) batches.push(batch)
    }

    // Process batches with available workers
    const promises: Promise<FitnessResult[]>[] = []
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]
      const worker = this.workers[i % this.workers.length]
      
      if (!worker || !batch) continue
      const message = { type: 'batch_fitness_calculation', batch, targetImageData }
      
      promises.push(this.sendMessageToWorker(worker, message))
    }

    // Wait for all batches to complete
    try {
      const batchResults = await Promise.all(promises)
      
      // Combine all results
      for (const batchResult of batchResults) {
        for (const result of batchResult) {
          results.set(result.individualId, result.fitness)
        }
      }
    } catch (error) {
      console.error('Worker batch processing failed:', error)
      // Set default fitness for failed individuals
      for (const individual of individuals) {
        if (!results.has(individual.individualId)) {
          results.set(individual.individualId, 0)
        }
      }
    }

    return results
  }

  terminate(): void {
    // Terminate all workers
    for (const worker of this.workers) {
      worker.terminate()
    }
    this.workers = []
  }
} 