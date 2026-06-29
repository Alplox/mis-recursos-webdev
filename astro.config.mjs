import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://alplox.github.io',
  base: '/mis-recursos-webdev',
  output: 'static',
  build: {
    assets: '_assets',
    compressHTML: true
  },
  trailingSlash: 'never'
})
