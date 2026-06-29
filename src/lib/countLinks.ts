import type { Section } from '../types'

export function countLinks(section: Section): number {
  let count = section.links.length
  for (const child of section.children || []) {
    count += countLinks(child)
  }
  return count
}
