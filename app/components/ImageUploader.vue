<template>
  <div class="space-y-4">
    <button
      v-if="!previewUrl"
      type="button"
      class="grid aspect-square w-full place-items-center rounded-xl border-2 border-dashed border-neutral-300 p-6 text-center transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:border-neutral-700"
      aria-label="Choose an image from your device"
      @click="triggerFileInput"
      @dragover.prevent
      @drop.prevent="handleDrop"
    >
      <div class="space-y-2">
        <UIcon name="lucide:upload" class="size-9 text-primary" />
        <div class="text-lg font-medium">Choose or drop an image</div>
        <div class="text-sm text-neutral-500">
          Click to choose a file, or drag and drop it here
        </div>
        <div class="text-xs text-neutral-500">
          Non-square images are center-cropped to a square
        </div>
        <div class="text-xs text-neutral-500">
          Supported extensions: .jpg, .jpeg, .png, .gif, .webp, .heic, .heif · max 5 MB
        </div>
      </div>
    </button>

    <input
      ref="fileInput"
      type="file"
      accept="image/*,.heic,.heif,image/heic,image/heif"
      class="hidden"
      aria-label="Choose an image file"
      @change="handleFileSelect"
    >

    <div v-if="previewUrl" class="space-y-2">
      <div class="relative">
        <img
          :src="previewUrl"
          alt="Selected image preview"
          class="block aspect-square w-full rounded-xl object-cover"
        >
        <div class="absolute right-2 top-2 rounded bg-black/60 px-2 py-1 text-xs text-white">
          {{ imageInfo }}
        </div>
      </div>
      <div class="flex items-center justify-between gap-3">
        <span class="text-sm text-neutral-500">Reference image</span>
        <UButton size="sm" color="neutral" variant="outline" icon="lucide:trash-2" @click="clearImage">
          Remove image
        </UButton>
      </div>
    </div>

    <div v-if="error" class="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300" role="alert">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits(['image-uploaded'])

const fileInput = useTemplateRef<HTMLInputElement>('fileInput')
const previewUrl = ref('')
const error = ref('')
const imageInfo = ref('')

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    processFile(file)
  }
}

const handleDrop = (event: DragEvent) => {
  const file = event.dataTransfer?.files[0]
  if (file) {
    processFile(file)
  }
}

const isHeicFile = (file: File) => {
  return /^image\/hei[cf]/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)
}

const processFile = async (file: File) => {
  error.value = ''
  
  // Validate file size (5MB limit)
  if (file.size > 5 * 1024 * 1024) {
    error.value = 'This file is too large. Choose an image up to 5 MB.'
    return
  }

  // Validate file type
  const isHeic = isHeicFile(file)
  if (!file.type.startsWith('image/') && !isHeic) {
    error.value = 'This file is not an image. Choose an image file.'
    return
  }

  let imageBlob: Blob | undefined = file
  let imageType = file.type || 'image/png'

  if (isHeic) {
    try {
      const { default: heic2any } = await import('heic2any')
      const converted = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.9
      })
      imageBlob = Array.isArray(converted) ? converted[0] : converted
      if (!imageBlob) {
        error.value = 'Could not convert the HEIC image. Try selecting a different file.'
        return
      }
      imageType = 'image/jpeg'
    } catch {
      error.value = 'Could not convert the HEIC image. Try selecting a different file.'
      return
    }
  }

  // Create preview URL
  const reader = new FileReader()
  reader.onload = (e: ProgressEvent<FileReader>) => {
    const result = e.target?.result
    if (typeof result !== 'string') {
      error.value = 'Could not read the file. Try selecting it again.'
      return
    }

    const img = new Image()
    img.onload = () => {
      const cropSize = Math.min(img.naturalWidth, img.naturalHeight)
      const cropX = (img.naturalWidth - cropSize) / 2
      const cropY = (img.naturalHeight - cropSize) / 2
      const canvas = document.createElement('canvas')
      canvas.width = cropSize
      canvas.height = cropSize

      const context = canvas.getContext('2d')
      if (!context) {
        error.value = 'Could not process the image. Try selecting it again.'
        return
      }

      context.drawImage(img, cropX, cropY, cropSize, cropSize, 0, 0, cropSize, cropSize)

      try {
        const croppedImage = canvas.toDataURL(imageType)
        previewUrl.value = croppedImage
        imageInfo.value = `${cropSize} × ${cropSize} · center-cropped`
        emit('image-uploaded', croppedImage)
      } catch {
        error.value = 'Could not process the image. Try selecting it again.'
      }
    }
    img.onerror = () => {
      error.value = 'Could not load the image. Try selecting a different file.'
    }
    img.src = result
  }
  
  reader.onerror = () => {
    error.value = 'Could not read the file. Try selecting it again.'
  }
  
  reader.readAsDataURL(imageBlob)
}

const clearImage = () => {
  previewUrl.value = ''
  imageInfo.value = ''
  error.value = ''
  if (fileInput.value) {
    fileInput.value.value = ''
  }
  emit('image-uploaded', '')
}
</script> 