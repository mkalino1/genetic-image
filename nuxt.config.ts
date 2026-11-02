// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-03-01',
  devtools: { enabled: true },
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxt/test-utils'
  ],
  imports: {
    dirs: ['engine/**']
  },
  css: ['~/assets/main.css'],
  nitro: {
    prerender: {
      routes: ['/']
    }
  }
})