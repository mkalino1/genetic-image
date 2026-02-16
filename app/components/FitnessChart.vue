<template>
  <div class="chart-container bg-neutral-200 dark:bg-neutral-800 rounded-lg p-4 min-h-[350px]">
    <h3 class="text-lg font-semibold mb-4">Fitness Evolution</h3>
    <apexchart 
      type="line" 
      :options="chartOptions" 
      :series="series" 
      height="300"
    />
  </div>
</template>

<script setup lang="ts">

const props = defineProps<{ fitnessData: { generation: number; fitness: number }[] }>()

const series = computed(() => [{
  name: 'Best Fitness',
  data: props.fitnessData.map(point => point.fitness)
}])

const chartOptions = {
  chart: {
    type: 'line',
    animations: {
      enabled: true,
      easing: 'linear',
      dynamicAnimation: {
        speed: 1000
      }
    },
    background: 'transparent',
    foreColor: '#ffffff'
  },
  theme: {
    mode: 'dark'
  },
  stroke: {
    curve: 'smooth',
    width: 3
  },
  colors: ['#10b981'],
  grid: {
    borderColor: '#374151',
    strokeDashArray: 4
  },
  xaxis: {
    title: { 
      text: 'Generation',
      style: {
        color: '#9ca3af'
      }
    },
    labels: {
      style: {
        colors: '#9ca3af'
      }
    },
    tickAmount: 10,
    tickPlacement: 'on'
  },
  yaxis: {
    title: { 
      text: 'Fitness Score',
      style: {
        color: '#9ca3af'
      }
    },
    labels: {
      style: {
        colors: '#9ca3af'
      },
      formatter: function(value: number) {
        return value.toFixed(5)
      }
    }
  },
  tooltip: {
    theme: 'dark'
  }
}
</script>