<template>
  <UApp>

    <div class="min-h-screen bg-neutral-300 dark:bg-neutral-900 p-4">
      <div class="max-w-7xl mx-auto">
        <!-- Header -->
        <header class="text-center mb-8 relative">
          <h1 class="text-4xl font-bold mb-2">Genetic Image Evolution</h1>
          <p class="text-neutral-600 dark:text-neutral-400">Evolve colorful shapes to match your image</p>
          <UColorModeButton class="absolute right-1 top-2" />
        </header>

        <!-- Main Content -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">

          <div class="space-y-4">
            <h2 class="text-2xl font-semibold">Target Image</h2>
            <div class="bg-neutral-200 dark:bg-neutral-800 rounded-lg p-4">
              <ImageUploader @image-uploaded="setTargetImage" />
            </div>
          </div>

          <div class="space-y-4">
            <h2 class="text-2xl font-semibold">Evolved Image</h2>
            <div class="bg-neutral-200 dark:bg-neutral-800 rounded-lg p-4">
              <canvas ref="canvas" width="160" height="160" class="w-full rounded-lg blur-xs" :style="{ backgroundColor: canvasBackgroundColor }" />
              <div class="mt-4 space-y-3">
                <MetricsDisplay :generation="generation" :best-fitness="bestFitness" :variance="variance" :adaptive-mutation-rate="adaptiveMutationRate" />
                <div class="flex gap-2">
                  <UButton :disabled="isEvolving" @click="startEvolution">
                    {{ isEvolving ? 'Evolving...' : 'Start Evolution' }}
                  </UButton>
                  <UButton :disabled="!isEvolving" color="secondary" @click="stopEvolution" >
                    Stop
                  </UButton>
                  <EvolutionParameters v-model="evolutionParams" />
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-4">
            <h2 class="text-2xl font-semibold">Description</h2>
            <div class="bg-neutral-200 dark:bg-neutral-800 rounded-lg p-4">
              <p v-if="description" class="mb-2">{{ description }}</p>
              <UButton :loading="isDescribing" @click="describeImage">Describe original image</UButton>
            </div>
          </div>

          <div class="space-y-4">
            <h2 class="text-2xl font-semibold">Recreated Image</h2>
            <div class="bg-neutral-200 dark:bg-neutral-800 rounded-lg p-4">
              <UButton :loading="isDecompressing" @click="decompressImage">Decompress Evolved Image</UButton>
              <img v-if="decompressedImage" :src="decompressedImage" alt="Decompressed Evolved Image" class="mt-4 rounded-lg">
            </div>
          </div>

        </div>
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

const description = ref('');
const isDescribing = ref(false);

async function describeImage() {
  if (!targetImage.value) {
    toast.add({
      title: 'Missing target image',
      icon: 'lucide:alert-triangle',
      description: 'Please upload a target image before attempting to describe it.'
    })
    return
  }
  isDescribing.value = true;
  try {
    const blob = await fetch(targetImage.value).then(res => res.blob())
    const form = new FormData()
    form.append('image', blob, 'image.jpg')

    const result = await $fetch('/api/describe', { method: 'POST', body: form })
    description.value = result
  } catch (err) {
    description.value = err instanceof Error ? err.message : String(err)
  } finally {
    isDescribing.value = false;
  }
}

const decompressedImage = ref('')
const isDecompressing = ref(false)

async function decompressImage() {
  if (description.value === '') {
    toast.add({
      title: 'Missing description',
      icon: 'lucide:alert-triangle',
      description: 'Please describe the image before attempting to decompress.'
    })
    return
  }
  if (decompressedImage.value) {
    URL.revokeObjectURL(decompressedImage.value)
  }

  isDecompressing.value = true
  try {
    const blob = await new Promise((resolve) => canvas.value?.toBlob(resolve, 'image/jpeg', 0.7))
    const form = new FormData()
    form.append('image', blob as Blob, 'evolved.jpg')
    form.append('description', description.value)
    const result = await $fetch('/api/decompress', { method: 'POST', body: form, responseType: 'blob' })
    const imageUrl = URL.createObjectURL(result as Blob)
    decompressedImage.value = imageUrl
  } catch (err) {
    toast.add({
      title: 'Decompression error',
      icon: 'lucide:alert-triangle',
      description: err instanceof Error ? err.message : String(err)
    })
  } finally {
    isDecompressing.value = false
  }
}

// Metrics
const generation = ref(0)
const bestFitness = ref(0)
const variance = ref(0)
const adaptiveMutationRate = ref(0)

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
  if (!targetImage.value) {
    toast.add({
      title: 'Missing target image',
      icon: 'lucide:alert-triangle',
      description: 'Please upload a target image before starting the evolution.'
    })
    return
  }
  isEvolving.value = true
  // Update evolution params with current shape mode
  geneticAlgorithm = new GeneticAlgorithm(canvas.value as HTMLCanvasElement, targetImageData.value!, evolutionParams)
  evolve()
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
  if (imageData == '') canvasBackgroundColor.value = 'rgb(255, 255, 255)' // reset to white
  targetImage.value = imageData
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
