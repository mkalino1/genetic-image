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
              <label for="hill-climbing" class="text-sm font-medium">Enable hill climbing</label>
            </div>
            <USwitch id="hill-climbing" v-model="model.enableHillClimbing" />
            <p class="mt-1 text-xs text-neutral-500">
              Locally refine the best candidates each generation. This can improve results but makes generations slower.
            </p>
          </div>
          <div>
            <div class="mb-1">
              <label for="population-size" class="text-sm font-medium">Population size</label>
            </div>
            <UInput
              id="population-size"
              v-model="model.populationSize"
              type="number"
              :min="parameterBounds.populationSize.min"
              :max="parameterBounds.populationSize.max"
            />
            <p class="mt-1 text-xs text-neutral-500">
              Candidates kept each generation; larger populations explore more but take longer.
              Low fitness variance adds {{ Math.round(EVOLUTION_CONFIG.diversityRecovery.randomImmigrantFraction * 100) }}% random candidates before selecting the best.
            </p>
          </div>
          <div>
            <div class="mb-1">
              <label for="mutation-rate" class="text-sm font-medium">Mutation rate</label>
            </div>
            <UInput
              id="mutation-rate"
              v-model="model.mutationRate"
              type="number"
              :min="parameterBounds.mutationRate.min"
              :max="parameterBounds.mutationRate.max"
              :step="parameterBounds.mutationRate.step"
            />
            <p class="mt-1 text-xs text-neutral-500">
              Chance to mutate each shape in an individual. This rate adapts automatically. The last {{ Math.round(EVOLUTION_CONFIG.mutation.stronglyMutatedTailFraction * 100) }}% of children mutate up to {{ EVOLUTION_CONFIG.mutation.strongMutationMultiplier }} times as often.
            </p>
          </div>
          <div>
            <div class="mb-1">
              <label for="shapes-per-individual" class="text-sm font-medium">Shapes per image</label>
            </div>
            <UInput
              id="shapes-per-individual"
              v-model="model.shapesPerIndividual"
              type="number"
              :min="parameterBounds.shapesPerIndividual.min"
              :max="parameterBounds.shapesPerIndividual.max"
            />
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
            <p class="mt-1 text-xs text-neutral-500">{{ shapeModeDescriptions[model.shapeMode ?? 'polygon'] }}</p>
          </div>
        </div>
      </div>
    </template>
  </USlideover>
</template>

<script lang="ts" setup>
import { EVOLUTION_CONFIG, SHAPE_CONFIG } from '../utils/imageEvolutionConfig'
import type { CrossoverStrategy, ShapeMode } from '../utils/imageEvolutionConfig'

const model = defineModel<EvolutionParams>({ required: true })
const parameterBounds = EVOLUTION_CONFIG.parameterBounds

// Define crossover strategy options for the template
const crossoverStrategyLabels: Record<CrossoverStrategy, string> = {
  uniform: 'Uniform',
  single_point: 'Single point',
  two_point: 'Two point',
  randomized: 'Randomized',
  adaptive: 'Adaptive'
}

const crossoverStrategyOptions = EVOLUTION_CONFIG.crossover.availableStrategies.map(value => ({
  label: crossoverStrategyLabels[value],
  value
}))

const crossoverStrategyDescriptions: Record<CrossoverStrategy, string> = {
  uniform: 'Randomly take each shape from either parent.',
  single_point: 'Take shapes before and after one split from different parents.',
  two_point: 'Take a segment from one parent and the rest from the other.',
  randomized: 'Randomly use uniform, single-point or two-point crossover.',
  adaptive: 'Choose crossover based on the best fitness so far.'
}

const shapeModeLabels: Record<ShapeMode, string> = {
  polygon: 'Random polygons',
  fixed: 'Fixed shapes'
}
const shapeTypOptions = SHAPE_CONFIG.modes.map(value => ({
  label: shapeModeLabels[value],
  value
}))

const shapeModeDescriptions: Record<ShapeMode, string> = {
  polygon: 'Use irregular polygons with mutable vertices.',
  fixed: 'Use circles, rectangles and triangles.'
}

</script>