import { id } from '@constellar/core'

import { Category } from '../category'
import { manyToMany } from '../relations'
import { fTags, Resources } from './Resource'

export const TagsToResources = new Category<string, string[]>('TagsToResources', () => [])

const Self = TagsToResources

manyToMany(Resources, fTags.view.bind(fTags), Self, id)
