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
                  <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">The best approximation from each generation. It may take a minute before a good result emerges.</p>
                </div>
                <span class="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200" role="status">
                  {{ evolutionStatus }}
                </span>
              </div>
              <div class="relative overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-950">
                <canvas
                  ref="canvas"
                  :width="CANVAS_CONFIG.displaySize"
                  :height="CANVAS_CONFIG.displaySize"
                  class="block aspect-square w-full"
                  aria-label="Current evolution result"
                />
                <div v-if="generation === 0" class="pointer-events-none absolute inset-0 grid place-items-center p-6 text-center text-sm text-neutral-600 dark:text-neutral-300">
                  {{ hasTargetImage ? 'Start the evolution to see the image take shape here.' : 'Upload a reference image to get started.' }}
                </div>
              </div>
              <section v-if="populationSamples.length" class="mt-5" aria-label="Population samples">
                <h3 class="text-sm font-semibold">Population samples</h3>
                <p class="mb-3 mt-1 text-xs text-neutral-500">
                  Four individuals evenly spaced by fitness rank in the latest generation.
                </p>
                <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <PopulationSamplePreview
                    v-for="sample in populationSamples"
                    :key="sample.rank"
                    :individual="sample.individual"
                    :rank="sample.rank"
                    :background-color="canvasBackgroundColor"
                  />
                </div>
              </section>
              <div v-if="bestErrorMap" class="mt-5">
                <h3 class="text-sm font-semibold">Error heatmap</h3>
                <p class="mb-2 mt-1 text-xs text-neutral-500">
                  Brighter areas have more weighted pixel error compared with the reference.
                </p>
                <ErrorMapDisplay
                  :error-map="bestErrorMap"
                  :width="CANVAS_CONFIG.worldSize"
                  :height="CANVAS_CONFIG.worldSize"
                />
              </div>
              <div class="mt-5 space-y-4">
                <MetricsDisplay
                  :generation="generation"
                  :best-fitness="bestFitness"
                  :fitness-variance="fitnessVariance"
                  :elapsed-time-ms="elapsedTimeMs"
                />
                <DevProfilingPanel
                  v-if="isDevelopment && profilingSummary"
                  :summary="profilingSummary"
                />
                <div class="flex flex-wrap items-center gap-2">
                  <UButton :disabled="!hasTargetImage || isEvolving" icon="lucide:play" @click="startEvolution">
                    {{ isEvolving ? 'Evolving…' : generation > 0 ? 'Restart evolution' : 'Start evolution' }}
                  </UButton>
                  <UButton :disabled="!isEvolving" color="neutral" variant="outline" icon="lucide:square" @click="stopEvolution">
                    Stop
                  </UButton>
                  <UButton :disabled="!currentBestIndividual" color="neutral" variant="outline" icon="lucide:download" @click="downloadEvolutionImage">
                    Download image
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
import { CANVAS_CONFIG, MINIMUM_EVOLUTION_GENERATIONS } from './engine/config'
const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
const target = useTargetImage(canvas)
const evolution = useEvolution({
  canvas,
  targetImage: target.targetImage,
  targetImageData: target.targetImageData,
  onStarted: () => ai.clearRecreatedImage()
})
const ai = useAiRecreation({
  targetImage: target.targetImage,
  hasTargetImage: target.hasTargetImage,
  currentBestIndividual: evolution.currentBestIndividual,
  canvasBackgroundColor: target.canvasBackgroundColor,
  generation: evolution.generation
})
const download = useDownload({
  individual: evolution.currentBestIndividual,
  backgroundColor: target.canvasBackgroundColor,
  generation: evolution.generation
})

const {
  canvasBackgroundColor,
  hasTargetImage,
  setTargetImage: loadTargetImage
} = target
const {
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
  reset: resetEvolution
} = evolution
const { downloadEvolutionImage } = download
const {
  description,
  isDescribing,
  recreatedImage,
  isRecreating,
  canRecreate,
  describeImage,
  recreateImage,
  reset: resetAi
} = ai
const isDevelopment = import.meta.dev

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

const setTargetImage = async (imageData: string) => {
  resetEvolution()
  resetAi()
  await loadTargetImage(imageData)
}
</script>
