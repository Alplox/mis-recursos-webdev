import { defineConfig } from 'astro/config'
import critters from 'astro-critters'
import compress from '@playform/compress'

export default defineConfig({
  site: 'https://alplox.github.io',
  base: '/',
  output: 'static',
  build: {
    assets: '_assets',
    compressHTML: true
  },
  trailingSlash: 'never',
  integrations: [
    critters(),
    compress({
      CSS: true,
      HTML: true,
      JavaScript: true,
      Image: false,
      SVG: false,
    }),
  ],
})
