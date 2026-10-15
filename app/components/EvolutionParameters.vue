<template>
  <USlideover title="Evolution settings">
    <UButton label="Settings" icon="lucide:sliders-horizontal" color="neutral" variant="outline" />
    <template #body>
      <div>
        <p class="mb-6 text-sm text-neutral-600 dark:text-neutral-400">
          These settings change how the algorithm searches for a matching image. The defaults are a good place to start.
        </p>
        <div class="flex flex-col gap-5">
          <div>
            <div class="mb-1 flex items-center gap-1">
              <label for="population-size" class="text-sm font-medium">Population size</label>
              <UTooltip
                text="More candidates may improve the result, but take longer to process.">
                <UIcon name="lucide:info" class="text-gray-400" />
              </UTooltip>
            </div>
            <UInput id="population-size" v-model="model.populationSize" type="number" min="10" max="1000" />
            <p class="mt-1 text-xs text-neutral-500">How many image variations the algorithm compares at once.</p>
          </div>
          <div>
            <div class="mb-1 flex items-center gap-1">
              <label for="mutation-rate" class="text-sm font-medium">Mutation rate</label>
              <UTooltip
                text="A higher value introduces more changes between generations.">
                <UIcon name="lucide:info" class="text-gray-400" />
              </UTooltip>
            </div>
            <UInput id="mutation-rate" v-model="model.mutationRate" type="number" min="0" max="1" step="0.01" />
            <p class="mt-1 text-xs text-neutral-500">More randomness can help discover new solutions.</p>
          </div>
          <div>
            <div class="mb-1 flex items-center gap-1">
              <label for="shapes-per-individual" class="text-sm font-medium">Shapes per image</label>
              <UTooltip
                text="More shapes can capture more detail, but require more computation.">
                <UIcon name="lucide:info" class="text-gray-400" />
              </UTooltip>
            </div>
            <UInput id="shapes-per-individual" v-model="model.shapesPerIndividual" type="number" min="1" max="100" />
            <p class="mt-1 text-xs text-neutral-500">More shapes may produce a closer match, but slow things down.</p>
          </div>
          <div>
            <div class="mb-1 flex items-center gap-1">
              <label for="crossover-strategy" class="text-sm font-medium">Crossover strategy</label>
              <UTooltip
                text="Determines how the algorithm combines traits from two well-matched images.">
                <UIcon name="lucide:info" class="text-gray-400" />
              </UTooltip>
            </div>
            <USelect id="crossover-strategy" v-model="model.crossoverStrategy" :items="crossoverStrategyOptions" />
          </div>
          <div>
            <div class="mb-1 flex items-center gap-1">
              <label for="shape-mode" class="text-sm font-medium">Shape type</label>
              <UTooltip
                text="Choose simple, regular shapes or more varied polygons.">
                <UIcon name="lucide:info" class="text-gray-400" />
              </UTooltip>
            </div>
            <USelect id="shape-mode" v-model="model.shapeMode" :items="shapeTypOptions" />
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

const shapeTypOptions: { label: string, value: string }[] = [
  { label: 'Fixed shapes', value: 'fixed' },
  { label: 'Random polygons', value: 'polygon' }
]

</script>