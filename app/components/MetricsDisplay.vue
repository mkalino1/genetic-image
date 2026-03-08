<template>
  <div class="flex flex-wrap gap-2 text-sm">
    <div class="bg-neutral-100 dark:bg-neutral-700 rounded p-2">
      <div class="text-neutral-400">Generation</div>
      <div class="font-mono">{{ generation }}</div>
    </div>
    <div class="bg-neutral-100 dark:bg-neutral-700 rounded p-2">
      <div class="text-neutral-400">Fitness</div>
      <div class="font-mono">{{ bestFitness.toFixed(4) }}</div>
    </div>
    <div class="bg-neutral-100 dark:bg-neutral-700 rounded p-2">
      <div class="text-neutral-400">Variance</div>
      <div class="font-mono">{{ variance.toFixed(4) }}</div>
    </div>
    <div class="bg-neutral-100 dark:bg-neutral-700 rounded p-2">
      <div class="text-neutral-400">Adaptive</div>
      <div class="font-mono">{{ adaptiveMutationRate.toFixed(4) }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  generation: number
  bestFitness: number
  variance: number
  adaptiveMutationRate: number
}>()
</script> 