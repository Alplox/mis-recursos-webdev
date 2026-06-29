import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { parse, countLinks } from './parse-readme.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUTPUT_PATH = join(ROOT, 'src', 'data', 'recursos.json')
const PUBLIC_PATH = join(ROOT, 'public', 'data', 'recursos.json')

const sections = parse()
const json = JSON.stringify(sections, null, 2)
mkdirSync(dirname(OUTPUT_PATH), { recursive: true })
writeFileSync(OUTPUT_PATH, json, 'utf-8')
mkdirSync(dirname(PUBLIC_PATH), { recursive: true })
writeFileSync(PUBLIC_PATH, json, 'utf-8')
console.log(`✅ README.md → recursos.json (${sections.length} secciones, ${countLinks(sections)} links)`)
