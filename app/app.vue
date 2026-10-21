<template>
  <UApp>
    <div class="min-h-screen bg-neutral-50 px-4 py-6 dark:bg-neutral-950 sm:px-6 lg:py-10">
      <div class="mx-auto max-w-6xl space-y-8">
        <header class="flex items-start justify-between gap-4">
          <div>
            <p class="mb-2 text-sm font-semibold uppercase tracking-wider text-primary">A genetic algorithm experiment</p>
            <h1 class="text-3xl font-bold tracking-tight sm:text-4xl">Watch an image emerge from shapes</h1>
            <p class="mt-3 max-w-3xl text-neutral-600 dark:text-neutral-400">
                Starting with random shapes, the algorithm gradually evolves an image to look more like your reference.
                See the result take form, then recreate the original image with AI.
            </p>
          </div>
          <UColorModeButton />
        </header>

        <ol class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Steps">
          <li
            v-for="(step, index) in workflowSteps"
            :key="step.title"
            class="flex items-center gap-3 rounded-xl border p-4"
            :class="step.done ? 'border-primary/40 bg-primary/5' : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'"
          >
            <span
              class="grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold"
              :class="step.done ? 'bg-primary text-white' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'"
            >{{ index + 1 }}</span>
            <span>
              <span class="block text-sm font-semibold">{{ step.title }}</span>
              <span class="block text-xs text-neutral-500">{{ step.description }}</span>
            </span>
          </li>
        </ol>

        <main class="space-y-8">
          <section class="grid gap-6 lg:grid-cols-2" aria-label="Image evolution">
            <div class="overflow-hidden rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 sm:p-6">
              <div class="mb-4">
                <p class="text-sm font-medium text-primary">Step 1</p>
                <h2 class="mt-1 text-xl font-semibold">Choose an image</h2>
                <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">The algorithm will use this image as a reference for matching the shapes.</p>
              </div>
              <ImageUploader @image-uploaded="setTargetImage" />
            </div>

            <div class="overflow-hidden rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 sm:p-6">
              <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p class="text-sm font-medium text-primary">Step 2</p>
                  <h2 class="mt-1 text-xl font-semibold">Watch it evolve</h2>
                  <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">The best approximation from each generation. It may take a few minutes of evolution before a good result emerges.</p>
                </div>
                <span class="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200" role="status">
                  {{ evolutionStatus }}
                </span>
              </div>
              <div class="relative overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-950">
                <canvas
                  ref="canvas"
                  width="160"
                  height="160"
                  class="block aspect-square w-full"
                  :style="{ backgroundColor: canvasBackgroundColor }"
                  aria-label="Current evolution result"
                />
                <div v-if="generation === 0" class="pointer-events-none absolute inset-0 grid place-items-center p-6 text-center text-sm text-neutral-600 dark:text-neutral-300">
                  {{ hasTargetImage ? 'Start the evolution to see the image take shape here.' : 'Upload a reference image to get started.' }}
                </div>
              </div>
              <div class="mt-5 space-y-4">
                <MetricsDisplay
                  :generation="generation"
                  :best-fitness="bestFitness"
                  :variance="variance"
                  :adaptive-mutation-rate="adaptiveMutationRate"
                />
                <div class="flex flex-wrap items-center gap-2">
                  <UButton :disabled="!hasTargetImage || isEvolving" icon="lucide:play" @click="startEvolution">
                    {{ isEvolving ? 'Evolving…' : generation > 0 ? 'Restart evolution' : 'Start evolution' }}
                  </UButton>
                  <UButton :disabled="!isEvolving" color="neutral" variant="outline" icon="lucide:square" @click="stopEvolution">
                    Stop
                  </UButton>
                  <EvolutionParameters v-model="evolutionParams" />
                </div>
                <p v-if="!hasTargetImage" class="text-sm text-neutral-500">Upload an image to get started.</p>
                <p v-else-if="isEvolving" class="text-sm text-neutral-500">You can stop the evolution at any time.</p>
                <p v-else class="text-sm text-neutral-500">Keep the default settings if you are not sure what to change.</p>
              </div>
            </div>
          </section>

          <section class="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 sm:p-6" aria-label="AI image recreation">
            <div class="mb-5">
              <p class="text-sm font-medium text-primary">Steps 3 and 4 · optional</p>
              <h2 class="mt-1 text-xl font-semibold">Ask AI to recreate the image</h2>
              <p class="mt-1 max-w-3xl text-sm text-neutral-600 dark:text-neutral-400">
                First, AI will describe the original, then recreate the image from that description and the evolution result.
              </p>
            </div>
            <div class="grid gap-6 lg:grid-cols-2">
              <div class="rounded-xl bg-neutral-50 p-4 dark:bg-neutral-950">
                <h3 class="font-semibold">3. Describe the original</h3>
                <p class="mt-1 min-h-10 whitespace-pre-wrap text-sm text-neutral-600 dark:text-neutral-400">
                  {{ description || 'AI will create a text description to use in the next step.' }}
                </p>
                <UButton class="mt-4" :disabled="!hasTargetImage || isDescribing" :loading="isDescribing" icon="lucide:sparkles" @click="describeImage">
                  {{ isDescribing ? 'Creating description…' : 'Describe image' }}
                </UButton>
              </div>
              <div class="rounded-xl bg-neutral-50 p-4 dark:bg-neutral-950">
                <h3 class="font-semibold">4. Recreate the image</h3>
                <p class="mt-1 min-h-10 text-sm text-neutral-600 dark:text-neutral-400">
                  {{ recreatedImage ? 'Done - compare the result with your reference image.' : `Requires a description and at least ${MINIMUM_EVOLUTION_GENERATIONS} completed evolution iterations.` }}
                </p>
                <UButton
                  class="mt-4"
                  :disabled="!canRecreate"
                  :loading="isRecreating"
                  color="neutral"
                  variant="outline"
                  icon="lucide:image"
                  @click="recreateImage"
                >
                  {{ isRecreating ? 'Generating image…' : 'Recreate image with AI' }}
                </UButton>
                <img
                  v-if="recreatedImage"
                  :src="recreatedImage"
                  alt="Image generated by AI from the description and evolution result"
                  class="mt-4 max-h-[32rem] w-full rounded-xl object-contain"
                >
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  </UApp>
</template>

<script setup lang="ts">
const toast = useToast()

const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
const canvasBackgroundColor = ref('rgb(255, 255, 255)') // default white
const isEvolving = ref(false)

const targetImage = ref('')
const targetImageData = ref<ImageData | null>(null)

const description = ref('')
const isDescribing = ref(false)

async function describeImage() {
  if (!hasTargetImage.value || isDescribing.value) {
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
    const blob = await fetch(targetImage.value).then(res => res.blob())
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

const recreatedImage = ref('')
const isRecreating = ref(false)

async function recreateImage() {
  if (!canRecreate.value) {
    toast.add({
      title: 'Missing information',
      icon: 'lucide:alert-triangle',
      description: `Upload an image, complete at least ${MINIMUM_EVOLUTION_GENERATIONS} evolution iterations.`
    })
    return
  }
  if (recreatedImage.value) {
    URL.revokeObjectURL(recreatedImage.value)
  }

  isRecreating.value = true
  try {
    const evolvedCanvas = canvas.value
    if (!evolvedCanvas) {
      throw new Error('Could not read the evolution result.')
    }
    const blob = await new Promise<Blob | null>((resolve) => evolvedCanvas.toBlob(resolve, 'image/jpeg', 0.7))
    if (!blob) {
      throw new Error('Could not prepare the image for recreation.')
    }
    const form = new FormData()
    form.append('image', blob, 'evolved.jpg')
    form.append('description', description.value)
    const result = await $fetch('/api/recreate', { method: 'POST', body: form, responseType: 'blob' })  as Blob;
    const imageUrl = URL.createObjectURL(result)
    recreatedImage.value = imageUrl
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

// Metrics
const MINIMUM_EVOLUTION_GENERATIONS = 50
const generation = ref(0)
const bestFitness = ref(0)
const variance = ref(0)
const adaptiveMutationRate = ref(0)
const hasTargetImage = computed(() => Boolean(targetImage.value && targetImageData.value))
const canRecreate = computed(() =>
  hasTargetImage.value
  && generation.value >= MINIMUM_EVOLUTION_GENERATIONS
  && description.value.trim() !== ''
  && !isDescribing.value
  && !isRecreating.value
)
const evolutionStatus = computed(() => {
  if (isEvolving.value) return 'Evolution in progress'
  if (generation.value > 0) return 'Result available'
  if (hasTargetImage.value) return 'Ready to start'
  return 'Waiting for image'
})
const workflowSteps = computed(() => [
  { title: 'Choose an image', description: 'Upload a picture', done: hasTargetImage.value },
  { title: 'Start evolution', description: 'Match the shapes', done: generation.value > 0 },
  { title: 'Create a description', description: 'Ask AI to describe it', done: description.value !== '' },
  { title: 'Recreate the image', description: 'Create an AI-generated version', done: recreatedImage.value !== '' }
])

const evolutionParams = reactive<EvolutionParams>({
  populationSize: 500,
  mutationRate: 0.05,
  shapesPerIndividual: 150,
  crossoverStrategy: 'uniform',
  shapeMode: 'fixed'
})

let geneticAlgorithm: GeneticAlgorithm | null = null
let animationId: number | null = null

const startEvolution = async () => {
  const imageData = targetImageData.value
  const displayCanvas = canvas.value
  if (!targetImage.value || !imageData || !displayCanvas || isEvolving.value) {
    toast.add({
      title: 'Could not start evolution',
      icon: 'lucide:alert-triangle',
      description: 'Upload an image and wait for it to finish processing.'
    })
    return
  }
  if (recreatedImage.value) {
    URL.revokeObjectURL(recreatedImage.value)
    recreatedImage.value = ''
  }
  try {
    geneticAlgorithm = new GeneticAlgorithm(displayCanvas, imageData, evolutionParams)
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

const stopEvolution = () => {
  isEvolving.value = false
  if (animationId !== null) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
  if (geneticAlgorithm) {
    geneticAlgorithm.cleanup()
  }
}

const evolve = async () => {
  if (!isEvolving.value) return
  if (geneticAlgorithm) {
    await geneticAlgorithm.evolve()
    // Update UI with current values
    generation.value = geneticAlgorithm.generation
    bestFitness.value = geneticAlgorithm.bestFitness
    variance.value = geneticAlgorithm.variance
    adaptiveMutationRate.value = geneticAlgorithm.adaptiveMutationRate
  }
  animationId = requestAnimationFrame(evolve)
}

const setTargetImage = async (imageData: string) => {
  stopEvolution()
  targetImageData.value = null
  generation.value = 0
  bestFitness.value = 0
  variance.value = 0
  adaptiveMutationRate.value = 0
  description.value = ''
  if (recreatedImage.value) {
    URL.revokeObjectURL(recreatedImage.value)
    recreatedImage.value = ''
  }
  targetImage.value = imageData
  if (!imageData) {
    canvasBackgroundColor.value = 'rgb(255, 255, 255)'
    const displayCanvas = canvas.value
    const context = displayCanvas?.getContext('2d')
    if (displayCanvas && context) {
      context.clearRect(0, 0, displayCanvas.width, displayCanvas.height)
    }
    return
  }
  // Initialize offscreen target canvas
  const img = new window.Image()
  img.src = targetImage.value
  await new Promise<void>((resolve) => {
    img.onload = () => {
      const targetCanvas = document.createElement('canvas')
      targetCanvas.width = 160
      targetCanvas.height = 160
      const targetCtx = targetCanvas.getContext('2d', { willReadFrequently: true })!
      targetCtx.drawImage(img, 0, 0, 160, 160)
      targetImageData.value = targetCtx.getImageData(0, 0, 160, 160)
      // Calculate average color and set background
      canvasBackgroundColor.value = calculateAverageColor(targetImageData.value)
      resolve()
    }
  })
}

const calculateAverageColor = (imageData: ImageData): string => {
  const data = imageData.data
  let r = 0, g = 0, b = 0, count = 0

  for (let i = 0; i < data.length; i += 4) {
    r += data[i]!
    g += data[i + 1]!
    b += data[i + 2]!
    count++
  }

  r = Math.round(r / count)
  g = Math.round(g / count)
  b = Math.round(b / count)

  // Lighten the color
  r = Math.min(255, Math.round(r * 1.5))
  g = Math.min(255, Math.round(g * 1.5))
  b = Math.min(255, Math.round(b * 1.5))

  return `rgb(${r}, ${g}, ${b})`
}
</script>
