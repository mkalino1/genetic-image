<template>
  <div class="grid grid-cols-2 gap-4 text-sm">
    <div class="bg-gray-700 rounded p-2">
      <div class="text-gray-400">Generation</div>
      <div class="font-mono">{{ generation }}</div>
    </div>
    <div class="bg-gray-700 rounded p-2">
      <div class="text-gray-400">Best Fitness</div>
      <div class="font-mono">{{ bestFitness.toFixed(3) }}</div>
    </div>
    <div class="bg-gray-700 rounded p-2">
      <div class="text-gray-400">Variance</div>
      <div class="font-mono">{{ variance.toFixed(5) }}</div>
    </div>
    <div class="bg-gray-700 rounded p-2">
      <div class="text-gray-400">Adaptive Mutation Rate</div>
      <div class="font-mono">{{ adaptiveMutationRate.toFixed(3) }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  generation: number
  bestFitness: number
  variance: number
  adaptiveMutationRate: number
}

defineProps<Props>()
</script> 