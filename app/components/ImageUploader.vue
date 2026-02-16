<template>
  <div class="space-y-4">
    <!-- Upload Area -->
    <div
      v-if="!previewUrl"
      class="border-2 border-dashed border-gray-400 dark:border-gray-600 rounded-lg p-6 text-center hover:border-gray-500 transition-colors cursor-pointer"
      @click="triggerFileInput"
      @dragover.prevent
      @drop.prevent="handleDrop"
    >
      <div class="space-y-2">
        <div class="text-4xl">📁</div>
        <div class="text-lg font-medium">Upload Target Image</div>
        <div class="text-sm text-gray-400">
          Click to browse or drag and drop an image file
        </div>
        <div class="text-xs text-gray-500">
          Supported formats: JPG, PNG (max 5MB)
        </div>
      </div>
    </div>

    <!-- Hidden file input -->
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      class="hidden"
      @change="handleFileSelect"
    >

    <!-- Preview -->
    <div v-if="previewUrl" class="space-y-2">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-medium">Preview</h3>
        <UButton size="sm" color="error" @click="clearImage">
          Remove
        </UButton>
      </div>
      <div class="relative">
        <img 
          :src="previewUrl" 
          alt="Target image preview" 
          class="w-full rounded-lg max-h-200 object-contain bg-gray-700"
        >
        <div class="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
          {{ imageInfo }}
        </div>
      </div>
    </div>

    <!-- Error message -->
    <div v-if="error" class="text-red-400 text-sm bg-red-900 bg-opacity-20 p-3 rounded">
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
    error.value = 'File size must be less than 5MB'
    return
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    error.value = 'Please select a valid image file'
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
    error.value = 'Failed to read image file'
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