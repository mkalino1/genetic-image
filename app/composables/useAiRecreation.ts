import { MINIMUM_EVOLUTION_GENERATIONS } from '../engine/config'
import { renderIndividualToPngBlob } from '../engine/image/imageExport'
import type { Individual } from '../engine/evolution/populationCreation'
import type { Ref } from 'vue'

interface UseAiRecreationOptions {
  targetImage: Readonly<Ref<string>>
  hasTargetImage: Readonly<Ref<boolean>>
  currentBestIndividual: Readonly<Ref<Individual | null>>
  canvasBackgroundColor: Readonly<Ref<string>>
  generation: Readonly<Ref<number>>
}

export function useAiRecreation(options: UseAiRecreationOptions) {
  const toast = useToast()
  const description = ref('')
  const isDescribing = ref(false)
  const recreatedImage = ref('')
  const isRecreating = ref(false)

  const canRecreate = computed(() =>
    options.hasTargetImage.value
    && options.generation.value >= MINIMUM_EVOLUTION_GENERATIONS
    && description.value.trim() !== ''
    && !isDescribing.value
    && !isRecreating.value
  )

  function clearRecreatedImage() {
    if (recreatedImage.value) {
      URL.revokeObjectURL(recreatedImage.value)
      recreatedImage.value = ''
    }
  }

  function reset() {
    description.value = ''
    clearRecreatedImage()
  }

  async function describeImage() {
    if (!options.hasTargetImage.value || isDescribing.value) {
      toast.add({
        title: 'Choose an image first',
        icon: 'lucide:alert-triangle',
        description: 'Upload the image you want to describe.'
      })
      return
    }
    isDescribing.value = true
    description.value = ''
    try {
      const blob = await fetch(options.targetImage.value).then(res => res.blob())
      const form = new FormData()
      form.append('image', blob, 'image.jpg')

      const response = await fetch('/api/describe', { method: 'POST', body: form })
      if (!response.ok) {
        throw new Error(`Description request failed (${response.status}).`)
      }
      if (!response.body) {
        throw new Error('The description response did not include a readable stream.')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        description.value += decoder.decode(value, { stream: true })
      }
      description.value += decoder.decode()
      if (!description.value.trim()) {
        throw new Error('The AI returned an empty description.')
      }
    } catch (err) {
      description.value = ''
      toast.add({
        title: 'Could not describe image',
        icon: 'lucide:alert-triangle',
        description: err instanceof Error ? err.message : String(err)
      })
    } finally {
      isDescribing.value = false
    }
  }

  async function recreateImage() {
    if (!canRecreate.value) {
      toast.add({
        title: 'Missing information',
        icon: 'lucide:alert-triangle',
        description: `Upload an image, complete at least ${MINIMUM_EVOLUTION_GENERATIONS} evolution iterations.`
      })
      return
    }
    clearRecreatedImage()

    isRecreating.value = true
    try {
      const individual = options.currentBestIndividual.value
      if (!individual) {
        throw new Error('Could not read the evolution result.')
      }
      const blob = await renderIndividualToPngBlob(individual, options.canvasBackgroundColor.value)
      const form = new FormData()
      form.append('image', blob, 'evolved.png')
      form.append('description', description.value)
      const result = await $fetch('/api/recreate', { method: 'POST', body: form, responseType: 'blob' }) as Blob
      recreatedImage.value = URL.createObjectURL(result)
    } catch (err) {
      toast.add({
        title: 'Could not recreate image',
        icon: 'lucide:alert-triangle',
        description: err instanceof Error ? err.message : String(err)
      })
    } finally {
      isRecreating.value = false
    }
  }

  onUnmounted(clearRecreatedImage)

  return {
    description,
    isDescribing,
    recreatedImage,
    isRecreating,
    canRecreate,
    describeImage,
    recreateImage,
    clearRecreatedImage,
    reset
  }
}
