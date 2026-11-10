import { CANVAS_CONFIG } from '../engine/config'
import { calculateBackgroundColor } from '../engine/image/backgroundColor'
import type { ShallowRef } from 'vue'

export function useTargetImage(canvas: Readonly<ShallowRef<HTMLCanvasElement | null>>) {
  const targetImage = ref('')
  const targetImageData = shallowRef<ImageData | null>(null)
  const canvasBackgroundColor = ref('rgb(255, 255, 255)')

  const hasTargetImage = computed(() => Boolean(targetImage.value && targetImageData.value))

  const setTargetImage = async (imageData: string) => {
    targetImage.value = imageData
    targetImageData.value = null

    if (!imageData) {
      canvasBackgroundColor.value = 'rgb(255, 255, 255)'
      const displayCanvas = canvas.value
      const context = displayCanvas?.getContext('2d')
      if (displayCanvas && context) {
        context.clearRect(0, 0, displayCanvas.width, displayCanvas.height)
      }
      return
    }

    const img = new window.Image()
    img.src = imageData
    await new Promise<void>((resolve) => {
      img.onload = () => {
        const targetCanvas = document.createElement('canvas')
        targetCanvas.width = CANVAS_CONFIG.worldSize
        targetCanvas.height = CANVAS_CONFIG.worldSize
        const targetContext = targetCanvas.getContext('2d', { willReadFrequently: true })!
        targetContext.drawImage(img, 0, 0, CANVAS_CONFIG.worldSize, CANVAS_CONFIG.worldSize)
        targetImageData.value = targetContext.getImageData(
          0,
          0,
          CANVAS_CONFIG.worldSize,
          CANVAS_CONFIG.worldSize
        )
        const backgroundColor = calculateBackgroundColor(targetImageData.value)
        canvasBackgroundColor.value = `rgb(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b})`
        resolve()
      }
    })
  }

  return {
    targetImage,
    targetImageData,
    canvasBackgroundColor,
    hasTargetImage,
    setTargetImage
  }
}
