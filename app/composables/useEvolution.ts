import { CANVAS_CONFIG, EVOLUTION_CONFIG } from '../engine/config'
import type { EvolutionParams } from '../engine/config'
import { EvolutionEngine } from '../engine/evolution/evolutionEngine'
import type { Individual, RankedIndividual } from '../engine/evolution/populationCreation'
import { renderIndividual } from '../engine/image/shapeRendering'
import type { GenerationProfilingSummary } from '../web-workers/workerTypes'
import type { Ref, ShallowRef } from 'vue'

interface UseEvolutionOptions {
  canvas: Readonly<ShallowRef<HTMLCanvasElement | null>>
  targetImage: Readonly<Ref<string>>
  targetImageData: Readonly<ShallowRef<ImageData | null>>
  onStarted?: () => void
}

export function useEvolution(options: UseEvolutionOptions) {
  const toast = useToast()
  const isDevelopment = import.meta.dev
  const isEvolving = ref(false)
  const currentBestIndividual = shallowRef<Individual | null>(null)
  const populationSamples = shallowRef<RankedIndividual[]>([])
  const generation = ref(0)
  const bestFitness = ref(0)
  const bestErrorMap = shallowRef<Float32Array | null>(null)
  const fitnessVariance = ref(0)
  const elapsedTimeMs = ref(0)
  const profilingSummary = ref<GenerationProfilingSummary | null>(null)
  const evolutionParams = reactive<EvolutionParams>({ ...EVOLUTION_CONFIG.defaults })

  let evolutionEngine: EvolutionEngine | null = null
  let displayContext: CanvasRenderingContext2D | null = null
  let animationId: number | null = null
  let evolutionStartedAt: number | null = null
  let elapsedTimer: number | null = null
  let runId = 0
  let uiDirty = false

  const runLoop = async (id: number) => {
    while (id === runId && evolutionEngine) {
      try {
        await evolutionEngine.evolve()
      } catch (err) {
        if (id !== runId) return
        toast.add({
          title: 'Evolution stopped',
          icon: 'lucide:alert-triangle',
          description: err instanceof Error ? err.message : String(err)
        })
        stopEvolution()
        return
      }
      if (id !== runId) return
      uiDirty = true
    }
  }

  const syncUi = () => {
    if (uiDirty && evolutionEngine) {
      uiDirty = false
      currentBestIndividual.value = evolutionEngine.bestIndividual
      populationSamples.value = evolutionEngine.populationSamples
      bestErrorMap.value = evolutionEngine.bestErrorMap
      generation.value = evolutionEngine.generation
      bestFitness.value = evolutionEngine.bestFitness
      fitnessVariance.value = evolutionEngine.fitnessVariance
      if (isDevelopment) {
        profilingSummary.value = evolutionEngine.getAverageProfilingMetrics()
      }
      if (evolutionEngine.bestIndividual && displayContext) {
        renderIndividual(evolutionEngine.bestIndividual, displayContext, evolutionEngine.backgroundColor)
      }
    }
    if (isEvolving.value) animationId = requestAnimationFrame(syncUi)
  }

  const stopEvolution = () => {
    runId++
    isEvolving.value = false
    uiDirty = true
    syncUi()
    if (evolutionStartedAt !== null) {
      elapsedTimeMs.value = Date.now() - evolutionStartedAt
      evolutionStartedAt = null
    }
    if (elapsedTimer !== null) {
      window.clearInterval(elapsedTimer)
      elapsedTimer = null
    }
    if (animationId !== null) {
      cancelAnimationFrame(animationId)
      animationId = null
    }
    if (evolutionEngine) {
      evolutionEngine.cleanup()
    }
  }

  const reset = () => {
    stopEvolution()
    currentBestIndividual.value = null
    populationSamples.value = []
    bestErrorMap.value = null
    generation.value = 0
    elapsedTimeMs.value = 0
    bestFitness.value = 0
    fitnessVariance.value = 0
    profilingSummary.value = null
  }

  const startEvolution = () => {
    const imageData = options.targetImageData.value
    const displayCanvas = options.canvas.value
    if (!options.targetImage.value || !imageData || !displayCanvas || isEvolving.value) {
      toast.add({
        title: 'Could not start evolution',
        icon: 'lucide:alert-triangle',
        description: 'Upload an image and wait for it to finish processing.'
      })
      return
    }

    options.onStarted?.()
    currentBestIndividual.value = null
    populationSamples.value = []
    bestErrorMap.value = null
    profilingSummary.value = null
    try {
      displayContext = displayCanvas.getContext('2d')
      if (!displayContext) throw new Error('Could not get 2D context')
      displayContext.setTransform(
        CANVAS_CONFIG.displaySize / CANVAS_CONFIG.worldSize,
        0,
        0,
        CANVAS_CONFIG.displaySize / CANVAS_CONFIG.worldSize,
        0,
        0
      )
      evolutionEngine = new EvolutionEngine(imageData, evolutionParams)
      elapsedTimeMs.value = 0
      evolutionStartedAt = Date.now()
      elapsedTimer = window.setInterval(() => {
        if (evolutionStartedAt !== null) {
          elapsedTimeMs.value = Date.now() - evolutionStartedAt
        }
      }, 1000)
      isEvolving.value = true
      uiDirty = false
      const id = ++runId
      runLoop(id)
      animationId = requestAnimationFrame(syncUi)
    } catch (err) {
      toast.add({
        title: 'Could not start evolution',
        icon: 'lucide:alert-triangle',
        description: err instanceof Error ? err.message : String(err)
      })
    }
  }

  onUnmounted(stopEvolution)

  return {
    isEvolving,
    currentBestIndividual,
    populationSamples,
    generation,
    bestFitness,
    bestErrorMap,
    fitnessVariance,
    elapsedTimeMs,
    profilingSummary,
    evolutionParams,
    startEvolution,
    stopEvolution,
    reset
  }
}
