<template>
  <section
    class="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3"
    aria-label="Development profiling"
  >
    <div class="mb-2 flex items-baseline justify-between gap-2">
      <h3 class="text-sm font-semibold">Dev profiling</h3>
      <span class="text-xs text-neutral-500">
        {{ summary.sampleCount === 20 ? 'Profiling complete' : `Average of ${summary.sampleCount} / 20 generations` }}
      </span>
    </div>
    <dl class="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
      <div>
        <dt class="text-xs text-neutral-500">Generation (sum, {{ summary.sampleCount }} iterations)</dt>
        <dd class="font-mono text-sm">{{ formatSeconds(summary.totalGenerationMs) }}</dd>
      </div>
      <div>
        <dt class="text-xs text-neutral-500">Generation (average)</dt>
        <dd class="font-mono text-sm">{{ formatMilliseconds(summary.metrics.generationMs) }}</dd>
      </div>
      <div>
        <dt class="text-xs text-neutral-500">Worker evaluation</dt>
        <dd class="font-mono text-sm">{{ formatMilliseconds(summary.metrics.workerEvaluationWallMs) }}</dd>
      </div>
      <div>
        <dt class="text-xs text-neutral-500">Fitness (worker average)</dt>
        <dd class="font-mono text-sm">{{ formatMilliseconds(summary.metrics.fitnessMs) }}</dd>
      </div>
      <div>
        <dt class="text-xs text-neutral-500">getImageData (worker average)</dt>
        <dd class="font-mono text-sm">{{ formatMilliseconds(summary.metrics.getImageDataMs) }}</dd>
      </div>
      <div>
        <dt class="text-xs text-neutral-500">Rendering (worker average)</dt>
        <dd class="font-mono text-sm">{{ formatMilliseconds(summary.metrics.renderingMs) }}</dd>
      </div>
      <div>
        <dt class="text-xs text-neutral-500">Sorting (worker average)</dt>
        <dd class="font-mono text-sm">{{ formatMilliseconds(summary.metrics.sortingMs) }}</dd>
      </div>
      <div>
        <dt class="text-xs text-neutral-500">Other generation work</dt>
        <dd class="font-mono text-sm">
          {{ formatMilliseconds(summary.metrics.generationMs - summary.metrics.workerEvaluationWallMs) }}
        </dd>
      </div>
    </dl>
    <p class="mt-2 text-xs text-neutral-500">
      Worker stage times are averaged across workers; worker evaluation is elapsed wall time.
    </p>
  </section>
</template>

<script setup lang="ts">
import type { GenerationProfilingSummary } from '../workers/workerTypes'

defineProps<{
  summary: GenerationProfilingSummary
}>()

function formatMilliseconds(milliseconds: number): string {
  return `${milliseconds.toFixed(1)} ms`
}

function formatSeconds(milliseconds: number): string {
  return `${(milliseconds / 1000).toFixed(2)} s`
}
</script>
