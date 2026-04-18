import type { ResourceId } from '../State/GameState'

export const RESOURCES: ResourceId[] = ['power', 'water', 'food']

export const RESOURCE_LABEL: Record<ResourceId, string> = {
  power: 'POWER',
  water: 'WATER',
  food: 'FOOD',
}

export const RESOURCE_ICON: Record<ResourceId, string> = {
  power: 'fa-bolt',
  water: 'fa-droplet',
  food: 'fa-seedling',
}
