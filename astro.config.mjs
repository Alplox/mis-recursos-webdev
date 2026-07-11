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
      CSS: false, // @playform/compress strips @media (max-width) queries — critters + native compressHTML handle the rest
      HTML: true,
      JavaScript: true,
      Image: false,
      SVG: false,
    }),
  ],
})
