// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxt/test-utils',
    '@nuxthub/core'
  ],
  ssr: false,
  css: ['~/assets/main.css'],
  routeRules: {
    '/': { prerender: true }
  },
  
  // Configure Vite for Web Workers
  vite: {
    worker: {
      format: 'es'
    },
    build: {
      rollupOptions: {
        output: {
          format: 'es'
        }
      }
    }
  }
})