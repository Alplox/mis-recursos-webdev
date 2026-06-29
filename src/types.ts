export interface Link {
  name: string
  url: string
  description?: string
}

export interface Section {
  id: string
  name: string
  level: number
  links: Link[]
  children: Section[]
}
