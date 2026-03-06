<template>
  <USlideover title="Evolution Parameters">
    <UButton label="Configure Evolution Parameters" color="neutral" variant="subtle" />
    <template #body>
      <div>
        <div class="flex flex-col gap-6">
          <div>
            <div class="flex items-center gap-1 mb-1">
              <label class="text-sm font-medium">Population Size</label>
              <UTooltip
                text="Number of individuals in each generation. Higher values may improve results but increase computation time.">
                <UIcon name="lucide:info" class="text-gray-400" />
              </UTooltip>
            </div>
            <UInput v-model="model.populationSize" type="number" min="10" max="1000" />
          </div>
          <div>
            <div class="flex items-center gap-1 mb-1">
              <label class="text-sm font-medium">Mutation Rate</label>
              <UTooltip
                text="Rate at which mutations occur. Higher values may improve exploration but can lead to instability.">
                <UIcon name="lucide:info" class="text-gray-400" />
              </UTooltip>
            </div>
            <UInput v-model="model.mutationRate" type="number" min="0" max="1" step="0.01" />
          </div>
          <div>
            <div class="flex items-center gap-1 mb-1">
              <label class="text-sm font-medium">Shapes per Individual</label>
              <UTooltip
                text="Number of shapes in each individual. Higher values may improve results but increase computation time.">
                <UIcon name="lucide:info" class="text-gray-400" />
              </UTooltip>
            </div>
            <UInput v-model="model.shapesPerIndividual" type="number" min="1" max="100" />
          </div>
          <div>
            <div class="flex items-center gap-1 mb-1">
              <label class="text-sm font-medium">Crossover Strategy</label>
              <UTooltip
                text="Strategy for combining genetic material from two parents. Different strategies may affect the diversity and convergence of the population.">
                <UIcon name="lucide:info" class="text-gray-400" />
              </UTooltip>
            </div>
            <USelect v-model="model.crossoverStrategy" :items="crossoverStrategyOptions" />
          </div>
          <div>
            <div class="flex items-center gap-1 mb-1">
              <label class="text-sm font-medium">Shape Type</label>
              <UTooltip
                text="Type of shapes to use in the evolution. Fixed shapes provide more control, while random polygons offer more diversity.">
                <UIcon name="lucide:info" class="text-gray-400" />
              </UTooltip>
            </div>
            <USelect v-model="model.shapeMode" :items="shapeTypOptions" />
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
  { label: 'Single Point', value: 'single_point' },
  { label: 'Two Point', value: 'two_point' },
  { label: 'Randomized', value: 'randomized' },
  { label: 'Adaptive', value: 'adaptive' }
]

const shapeTypOptions: { label: string, value: string }[] = [
  { label: 'Fixed Shapes', value: 'fixed' },
  { label: 'Random Polygons', value: 'polygon' }
]

</script>