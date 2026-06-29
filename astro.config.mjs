import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://alplox.github.io',
  base: '/',
  output: 'static',
  build: {
    assets: '_assets',
    compressHTML: true
  },
  trailingSlash: 'never'
})
