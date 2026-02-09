<template>
  <div class="min-h-screen bg-gray-900 text-white p-4">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <header class="text-center mb-8">
        <h1 class="text-4xl font-bold mb-2">Genetic Image Evolution</h1>
        <p class="text-gray-400">Evolve colorful shapes to match your image</p>
      </header>

      <!-- Main Content -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Target Image Section -->
        <div class="space-y-4">
          <h2 class="text-2xl font-semibold">Target Image</h2>
          <div class="bg-gray-800 rounded-lg p-4">
            <ImageUploader @image-uploaded="setTargetImage" />
          </div>
        </div>

        <!-- Evolved Image Section -->
        <div class="space-y-4">
          <h2 class="text-2xl font-semibold">Evolved Image</h2>
          <div class="bg-gray-800 rounded-lg p-4">
            <canvas ref="canvas" width="160" height="160" class="w-full rounded-lg bg-white blur-[6px]" />
            <div class="mt-4 space-y-3">
              <MetricsDisplay
                :generation="generation"
                :best-fitness="bestFitness"
                :variance="variance"
                :adaptive-mutation-rate="adaptiveMutationRate"
              />
              
              <div class="flex gap-2">
                <UButton :disabled="isEvolving" color="success" @click="startEvolution">
                  {{ isEvolving ? 'Evolving...' : 'Start Evolution' }}
                </UButton>
                <UButton :disabled="!isEvolving" color="error" @click="stopEvolution">
                  Stop
                </UButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Controls Section -->
      <div class="mt-8 bg-gray-800 rounded-lg p-6">
        <h2 class="text-2xl font-semibold mb-4">Evolution Parameters</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <label class="block text-sm font-medium mb-2">Population Size</label>
            <UInput v-model="evolutionParams.populationSize" type="number" min="10" max="1000" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Mutation Rate</label>
            <UInput v-model="evolutionParams.mutationRate" type="number" min="0" max="1" step="0.01" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Shapes per Individual</label>
            <UInput v-model="evolutionParams.shapesPerIndividual" type="number" min="1" max="100" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Crossover Strategy</label>
            <USelect 
              v-model="evolutionParams.crossoverStrategy"
              :items="crossoverStrategyOptions"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Shape Type</label>
            <USelect 
              v-model="shapeMode"
              :items="shapeTypOptions"
            />
          </div>
        </div>
      </div>

      <!-- Fitness Chart -->
      <div class="mt-8">
        <FitnessChart :fitness-data="fitnessHistory" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Define crossover strategy options for the template
const crossoverStrategyOptions: {label: string, value: CrossoverStrategy}[] = [
  { label: 'Uniform', value: 'uniform'},
  { label: 'Single Point', value: 'single_point'},
  { label: 'Two Point', value: 'two_point'},
  { label: 'Randomized', value: 'randomized'},
  { label: 'Adaptive', value: 'adaptive'}
]

const shapeTypOptions: {label: string, value: string}[] = [
  { label: 'Fixed Shapes', value: 'fixed'},
  { label: 'Random Polygons', value: 'polygon'}
]

const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
const isEvolving = ref(false)
const shapeMode = ref<'fixed' | 'polygon'>('fixed')

const targetImage = ref('')
const targetImageData = ref<ImageData | null>(null)

// Metrics
const generation = ref(0)
const bestFitness = ref(0)
const variance = ref(0)
const adaptiveMutationRate = ref(0)

// Fitness history for chart
const fitnessHistory = ref<{ generation: number; fitness: number }[]>([])

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
    alert('Please upload a target image first!')
    return
  }
  isEvolving.value = true
  // Reset fitness history when starting new evolution
  fitnessHistory.value = []
  // Update evolution params with current shape mode
  evolutionParams.shapeMode = shapeMode.value
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
    
    // Add fitness data to history for chart
    fitnessHistory.value.push({
      generation: geneticAlgorithm.generation,
      fitness: geneticAlgorithm.bestFitness
    })
  }
  animationId = requestAnimationFrame(evolve)
}

const setTargetImage = async (imageData: string) => {
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
      resolve()
    }
  })
}
</script>
