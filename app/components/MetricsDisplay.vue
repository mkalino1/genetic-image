<template>
  <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
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
      <div class="text-xs text-neutral-500">Fitness variance</div>
      <div class="mt-1 font-mono text-lg font-semibold">{{ fitnessVariance.toFixed(6) }}</div>
      <p class="mt-1 text-xs text-neutral-500">Spread of fitness scores.</p>
    </div>
    <div class="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-950">
      <div class="text-xs text-neutral-500">Mutation rate</div>
      <div class="mt-1 font-mono text-lg font-semibold">{{ (adaptiveMutationRate * 100).toFixed(1) }}%</div>
      <p class="mt-1 text-xs text-neutral-500">The algorithm adjusts this automatically.</p>
    </div>
    <div class="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-950">
      <div class="text-xs text-neutral-500">Elapsed time</div>
      <div class="mt-1 font-mono text-lg font-semibold">{{ formattedElapsedTime }}</div>
      <p class="mt-1 text-xs text-neutral-500">Time since the evolution started.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  generation: number
  bestFitness: number
  fitnessVariance: number
  adaptiveMutationRate: number
  elapsedTimeMs: number
}>()

const formattedElapsedTime = computed(() => {
  const totalSeconds = Math.floor(props.elapsedTimeMs / 1000)
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  const totalMinutes = Math.floor(totalSeconds / 60)
  const minutes = String(totalMinutes % 60).padStart(2, '0')
  const hours = Math.floor(totalMinutes / 60)

  return hours > 0
    ? `${String(hours).padStart(2, '0')}:${minutes}:${seconds}`
    : `${totalMinutes}:${seconds}`
})
</script>