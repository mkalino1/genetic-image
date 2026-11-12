/// <reference types="vitest/globals" />

import { FitnessWorkerPool } from '../../app/engine/fitness/fitnessWorkerPool'

describe('fitness worker pool', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('rejects pending requests when terminated', async () => {
    class FakeWorker {
      addEventListener() {}
      removeEventListener() {}
      postMessage() {}
      terminate() {}
    }

    vi.stubGlobal('Worker', FakeWorker)
    vi.stubGlobal('navigator', { hardwareConcurrency: 1 })

    const workerPool = new FitnessWorkerPool()
    const targetImageData = {
      width: 1,
      height: 1,
      data: new Uint8ClampedArray(4)
    } as ImageData
    const pendingRequest = workerPool.calculateFitnessBatches([], targetImageData)

    workerPool.terminate()

    await expect(pendingRequest).rejects.toThrow('Worker pool terminated')
  })
})
