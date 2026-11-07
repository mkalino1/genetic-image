<template>
  <div class="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-950 dark:border-neutral-800">
    <canvas
      ref="canvas"
      :width="width"
      :height="height"
      class="block aspect-square w-full"
      aria-label="Pixel error heat map for the best individual"
      role="img"
    />
    <div class="flex items-center justify-between gap-3 px-3 py-2 text-xs text-neutral-300">
      <span>Lower error</span>
      <span class="h-2 flex-1 rounded-full bg-gradient-to-r from-slate-900 via-orange-500 to-yellow-300" aria-hidden="true" />
      <span>Higher error</span>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  errorMap: Float32Array
  width: number
  height: number
}>()

const canvas = ref<HTMLCanvasElement | null>(null)

function renderErrorMap() {
  const context = canvas.value?.getContext('2d')
  if (!context) {
    throw new Error('Could not render the error map')
  }
  if (props.errorMap.length !== props.width * props.height) {
    throw new Error('Error map dimensions do not match the canvas')
  }

  const imageData = context.createImageData(props.width, props.height)
  let maximumError = 0
  for (const error of props.errorMap) {
    maximumError = Math.max(maximumError, error)
  }

  for (let pixel = 0; pixel < props.errorMap.length; pixel++) {
    const error = props.errorMap[pixel] ?? 0
    const intensity = maximumError > 0 ? Math.sqrt(error / maximumError) : 0
    const red = intensity < 0.5
      ? Math.round(15 + (249 - 15) * intensity * 2)
      : 249
    const green = intensity < 0.5
      ? Math.round(23 + (115 - 23) * intensity * 2)
      : Math.round(115 + (204 - 115) * (intensity - 0.5) * 2)
    const blue = intensity < 0.5
      ? Math.round(42 + (22 - 42) * intensity * 2)
      : Math.round(22 + (21 - 22) * (intensity - 0.5) * 2)
    const offset = pixel * 4
    imageData.data[offset] = red
    imageData.data[offset + 1] = green
    imageData.data[offset + 2] = blue
    imageData.data[offset + 3] = 255
  }

  context.putImageData(imageData, 0, 0)
}

onMounted(renderErrorMap)
watch(() => props.errorMap, renderErrorMap, { flush: 'post' })
</script>
