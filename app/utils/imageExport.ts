import { CANVAS_CONFIG } from './imageEvolutionConfig'

export function renderIndividualToPngBlob(individual: Individual, backgroundColor: string): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_CONFIG.exportSize
  canvas.height = CANVAS_CONFIG.exportSize

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Could not prepare the evolution result for download.')
  }

  context.scale(
    CANVAS_CONFIG.exportSize / CANVAS_CONFIG.worldSize,
    CANVAS_CONFIG.exportSize / CANVAS_CONFIG.worldSize
  )
  renderIndividual(individual, context)
  context.setTransform(1, 0, 0, 1, 0, 0)
  context.globalCompositeOperation = 'destination-over'
  context.fillStyle = backgroundColor
  context.fillRect(0, 0, CANVAS_CONFIG.exportSize, CANVAS_CONFIG.exportSize)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error('Could not prepare the evolution result for download.'))
      }
    }, 'image/png')
  })
}
