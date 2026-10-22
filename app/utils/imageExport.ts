const EVOLVED_IMAGE_EXPORT_SIZE = 1024

export function renderIndividualToPngBlob(individual: Individual, backgroundColor: string): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = EVOLVED_IMAGE_EXPORT_SIZE
  canvas.height = EVOLVED_IMAGE_EXPORT_SIZE

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Could not prepare the evolution result for download.')
  }

  context.scale(EVOLVED_IMAGE_EXPORT_SIZE / WORLD_SIZE, EVOLVED_IMAGE_EXPORT_SIZE / WORLD_SIZE)
  renderIndividual(individual, context)
  context.setTransform(1, 0, 0, 1, 0, 0)
  context.globalCompositeOperation = 'destination-over'
  context.fillStyle = backgroundColor
  context.fillRect(0, 0, EVOLVED_IMAGE_EXPORT_SIZE, EVOLVED_IMAGE_EXPORT_SIZE)

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
