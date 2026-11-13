import { CANVAS_CONFIG, EVOLUTION_CONFIG } from '../engine/config'
import type { EvolutionParams } from '../engine/config'
import { EvolutionEngine } from '../engine/evolution/evolutionEngine'
import type { Individual, RankedIndividual } from '../engine/evolution/populationCreation'
import type { EvolutionSnapshot } from '../engine/evolution/evolutionSnapshot'
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
  const isEvolving = ref(false)
  const snapshot = shallowRef<EvolutionSnapshot | null>(null)
  const currentBestIndividual = computed(() => snapshot.value?.bestIndividual ?? null)
  const populationSamples = computed<readonly RankedIndividual[]>(() => snapshot.value?.populationSamples ?? [])
  const generation = computed(() => snapshot.value?.generation ?? 0)
  const bestFitness = computed(() => snapshot.value?.bestFitness ?? 0)
  const bestErrorMap = computed(() => snapshot.value?.bestErrorMap ?? null)
  const fitnessVariance = computed(() => snapshot.value?.fitnessVariance ?? 0)
  const elapsedTimeMs = ref(0)
  const profilingSummary = computed<GenerationProfilingSummary | null>(() => snapshot.value?.profiling ?? null)
  const evolutionParams = reactive<EvolutionParams>({ ...EVOLUTION_CONFIG.defaults })

  let evolutionEngine: EvolutionEngine | null = null
  let displayContext: CanvasRenderingContext2D | null = null
  let animationId: number | null = null
  let evolutionStartedAt: number | null = null
  let elapsedTimer: number | null = null
  let runId = 0
  let lastRenderedSnapshot: EvolutionSnapshot | null = null

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
    }
  }

  const syncUi = () => {
    const latest = evolutionEngine?.latestSnapshot ?? null
    if (latest !== snapshot.value) snapshot.value = latest
    if (latest !== lastRenderedSnapshot) {
      if (latest?.bestIndividual && displayContext && evolutionEngine) {
        renderIndividual(latest.bestIndividual, displayContext, evolutionEngine.backgroundColor)
      }
      lastRenderedSnapshot = latest
    }
    if (isEvolving.value) animationId = requestAnimationFrame(syncUi)
  }

  const stopEvolution = () => {
    runId++
    isEvolving.value = false
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
    snapshot.value = null
    lastRenderedSnapshot = null
    elapsedTimeMs.value = 0
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
    snapshot.value = null
    lastRenderedSnapshot = null
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
