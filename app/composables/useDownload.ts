import { renderIndividualToPngBlob } from '../engine/image/imageExport'
import type { Individual } from '../engine/evolution/populationCreation'
import type { Ref } from 'vue'

interface UseDownloadOptions {
  individual: Readonly<Ref<Individual | null>>
  backgroundColor: Readonly<Ref<string>>
  generation: Readonly<Ref<number>>
}

export function useDownload(options: UseDownloadOptions) {
  const toast = useToast()

  async function downloadEvolutionImage() {
    const individual = options.individual.value
    if (!individual) return

    try {
      const blob = await renderIndividualToPngBlob(individual, options.backgroundColor.value)
      const imageUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = imageUrl
      link.download = `evolved-image-generation-${options.generation.value}.png`
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(imageUrl), 0)
    } catch (err) {
      toast.add({
        title: 'Could not download image',
        icon: 'lucide:alert-triangle',
        description: err instanceof Error ? err.message : String(err)
      })
    }
  }

  return { downloadEvolutionImage }
}
