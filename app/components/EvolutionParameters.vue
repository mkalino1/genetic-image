<template>
  <USlideover title="Evolution settings">
    <UButton label="Settings" icon="lucide:sliders-horizontal" color="neutral" variant="outline" />
    <template #body>
      <div>
        <p class="mb-6 text-sm text-neutral-600 dark:text-neutral-400">
          Adjust how the algorithm searches for a matching image. The defaults are a good place to start.
        </p>
        <div class="flex flex-col gap-5">
          <div>
            <div class="mb-1">
              <label for="population-size" class="text-sm font-medium">Population size</label>
            </div>
            <UInput id="population-size" v-model="model.populationSize" type="number" min="10" max="1000" />
            <p class="mt-1 text-xs text-neutral-500">
              Candidates kept each generation; larger populations explore more but take longer.
              Low diversity adds 40% random candidates before selecting the best.
            </p>
          </div>
          <div>
            <div class="mb-1">
              <label for="mutation-rate" class="text-sm font-medium">Mutation rate</label>
            </div>
            <UInput id="mutation-rate" v-model="model.mutationRate" type="number" min="0.01" max="0.3" step="0.01" />
            <p class="mt-1 text-xs text-neutral-500">
              Chance to mutate each shape in an individual. This rate adapts automatically. The last 10% of children mutate twice as often.
            </p>
          </div>
          <div>
            <div class="mb-1">
              <label for="shapes-per-individual" class="text-sm font-medium">Shapes per image</label>
            </div>
            <UInput id="shapes-per-individual" v-model="model.shapesPerIndividual" type="number" min="1" max="300" />
            <p class="mt-1 text-xs text-neutral-500">More shapes capture finer detail, but slow down each generation.</p>
          </div>
          <div>
            <div class="mb-1">
              <label for="crossover-strategy" class="text-sm font-medium">Crossover strategy</label>
            </div>
            <USelect id="crossover-strategy" v-model="model.crossoverStrategy" :items="crossoverStrategyOptions" />
            <p class="mt-1 text-xs text-neutral-500">{{ crossoverStrategyDescriptions[model.crossoverStrategy] }}</p>
          </div>
          <div>
            <div class="mb-1">
              <label for="shape-mode" class="text-sm font-medium">Shape type</label>
            </div>
            <USelect id="shape-mode" v-model="model.shapeMode" :items="shapeTypOptions" />
            <p class="mt-1 text-xs text-neutral-500">{{ shapeModeDescriptions[model.shapeMode ?? 'fixed'] }}</p>
          </div>
        </div>
      </div>
    </template>
  </USlideover>
</template>

<script lang="ts" setup>
const model = defineModel<EvolutionParams>({ required: true })

// Define crossover strategy options for the template
const crossoverStrategyOptions: { label: string, value: CrossoverStrategy }[] = [
  { label: 'Uniform', value: 'uniform' },
  { label: 'Single point', value: 'single_point' },
  { label: 'Two point', value: 'two_point' },
  { label: 'Randomized', value: 'randomized' },
  { label: 'Adaptive', value: 'adaptive' }
]

const crossoverStrategyDescriptions: Record<CrossoverStrategy, string> = {
  uniform: 'Randomly take each shape from either parent.',
  single_point: 'Take shapes before and after one split from different parents.',
  two_point: 'Take a segment from one parent and the rest from the other.',
  randomized: 'Randomly use uniform, single-point or two-point crossover.',
  adaptive: 'Choose crossover based on the best fitness so far.'
}

const shapeTypOptions: { label: string, value: 'fixed' | 'polygon' }[] = [
  { label: 'Fixed shapes', value: 'fixed' },
  { label: 'Random polygons', value: 'polygon' }
]

const shapeModeDescriptions: Record<'fixed' | 'polygon', string> = {
  fixed: 'Use circles, rectangles and triangles.',
  polygon: 'Use irregular polygons with mutable vertices.'
}

</script>