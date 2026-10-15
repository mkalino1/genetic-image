<template>
  <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
    <div class="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-950">
      <div class="text-xs text-neutral-500">Generation</div>
      <div class="mt-1 font-mono text-lg font-semibold">{{ generation }}</div>
      <p class="mt-1 text-xs text-neutral-500">One iteration of the algorithm.</p>
    </div>
    <div class="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-950">
      <div class="text-xs text-neutral-500">Fitness</div>
      <div class="mt-1 font-mono text-lg font-semibold">{{ bestFitness.toFixed(4) }}</div>
      <p class="mt-1 text-xs text-neutral-500">A higher score means a closer match.</p>
    </div>
    <div class="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-950">
      <div class="text-xs text-neutral-500">Diversity</div>
      <div class="mt-1 font-mono text-lg font-semibold">{{ variance.toFixed(4) }}</div>
      <p class="mt-1 text-xs text-neutral-500">How varied the population's scores are.</p>
    </div>
    <div class="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-950">
      <div class="text-xs text-neutral-500">Mutation rate</div>
      <div class="mt-1 font-mono text-lg font-semibold">{{ (adaptiveMutationRate * 100).toFixed(1) }}%</div>
      <p class="mt-1 text-xs text-neutral-500">The algorithm adjusts this automatically.</p>
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