import { EVOLUTION_CONFIG } from '../engine/config'
import type { EvolutionParams } from '../engine/config'
import { GeneticAlgorithm } from '../engine/evolution/geneticAlgorithm'
import type { Individual, RankedIndividual } from '../engine/evolution/populationCreation'
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

  let geneticAlgorithm: GeneticAlgorithm | null = null
  let animationId: number | null = null
  let evolutionStartedAt: number | null = null
  let elapsedTimer: number | null = null

  const evolve = async () => {
    if (!isEvolving.value) return
    if (geneticAlgorithm) {
      await geneticAlgorithm.evolve()
      currentBestIndividual.value = geneticAlgorithm.bestIndividual
      populationSamples.value = geneticAlgorithm.populationSamples
      bestErrorMap.value = geneticAlgorithm.bestErrorMap
      generation.value = geneticAlgorithm.generation
      bestFitness.value = geneticAlgorithm.bestFitness
      fitnessVariance.value = geneticAlgorithm.fitnessVariance
      if (isDevelopment) {
        profilingSummary.value = geneticAlgorithm.getAverageProfilingMetrics()
      }
    }
    animationId = requestAnimationFrame(evolve)
  }

  const stopEvolution = () => {
    isEvolving.value = false
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
    if (geneticAlgorithm) {
      geneticAlgorithm.cleanup()
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
      geneticAlgorithm = new GeneticAlgorithm(displayCanvas, imageData, evolutionParams)
      elapsedTimeMs.value = 0
      evolutionStartedAt = Date.now()
      elapsedTimer = window.setInterval(() => {
        if (evolutionStartedAt !== null) {
          elapsedTimeMs.value = Date.now() - evolutionStartedAt
        }
      }, 1000)
      isEvolving.value = true
      evolve()
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
