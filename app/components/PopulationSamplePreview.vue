<template>
  <div class="rounded-lg border border-neutral-200 bg-white p-2 dark:border-neutral-800 dark:bg-neutral-900">
    <div class="mb-2 flex items-center justify-between gap-2 text-xs">
      <span class="font-semibold">#{{ rank }}</span>
      <span class="font-mono text-neutral-500">{{ individual.fitness.toFixed(4) }}</span>
    </div>
    <canvas
      ref="previewCanvas"
      :width="PREVIEW_SIZE"
      :height="PREVIEW_SIZE"
      class="block aspect-square w-full rounded bg-neutral-100 dark:bg-neutral-950"
      :style="{ backgroundColor }"
      :aria-label="`Population individual at rank ${rank}`"
    />
  </div>
</template>

<script setup lang="ts">
import type { Individual } from '../engine/evolution/populationCreation'
import { renderIndividual } from '../engine/image/shapeRendering'
import { CANVAS_CONFIG } from '../engine/config'

const PREVIEW_SIZE = 96

const props = defineProps<{
  individual: Individual
  rank: number
  backgroundColor: string
}>()

const previewCanvas = useTemplateRef<HTMLCanvasElement>('previewCanvas')

function renderPreview() {
  const canvas = previewCanvas.value
  const context = canvas?.getContext('2d')
  if (!canvas || !context) return

  context.setTransform(
    PREVIEW_SIZE / CANVAS_CONFIG.worldSize,
    0,
    0,
    PREVIEW_SIZE / CANVAS_CONFIG.worldSize,
    0,
    0
  )
  renderIndividual(props.individual, context)
}

onMounted(renderPreview)
watch(() => [props.individual, props.backgroundColor], renderPreview)
</script>
