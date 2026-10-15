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
          Image files · max 5 MB
        </div>
      </div>
    </button>

    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      class="hidden"
      aria-label="Choose an image file"
      @change="handleFileSelect"
    >

    <div v-if="previewUrl" class="space-y-2">
      <div class="relative">
        <img
          :src="previewUrl"
          alt="Selected image preview"
          class="block h-auto w-full rounded-xl"
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

const processFile = (file: File) => {
  error.value = ''
  
  // Validate file size (5MB limit)
  if (file.size > 5 * 1024 * 1024) {
    error.value = 'This file is too large. Choose an image up to 5 MB.'
    return
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    error.value = 'This file is not an image. Choose an image file.'
    return
  }

  // Create preview URL
  const reader = new FileReader()
  reader.onload = (e: ProgressEvent<FileReader>) => {
    const result = e.target?.result as string
    previewUrl.value = result
    
    // Get image dimensions
    const img = new Image()
    img.onload = () => {
      imageInfo.value = `${img.width} × ${img.height}`
      emit('image-uploaded', result)
    }
    img.src = result
  }
  
  reader.onerror = () => {
    error.value = 'Could not read the file. Try selecting it again.'
  }
  
  reader.readAsDataURL(file)
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