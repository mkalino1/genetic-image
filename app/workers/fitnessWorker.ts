import type { FitnessTask, FitnessResult } from './workerTypes'

// Worker message handler
self.onmessage = function(e: MessageEvent) {
  const { type, batch, targetImageData } = e.data
  
  if (type === 'batch_fitness_calculation') {
    try {
      const results: FitnessResult[] = []
      
      for (const task of batch as FitnessTask[]) {
        const { imageData, individualId } = task
        const fitness = calculateFitness(imageData, targetImageData)
        results.push({ individualId, fitness })
      } 
      self.postMessage({ type: 'batch_fitness_result', results, success: true })

    } catch (error) {
      console.error('Worker batch error:', error)
      self.postMessage({ type: 'batch_fitness_result', error: error instanceof Error ? error.message : 'Unknown error', success: false })
    }
  }
} 