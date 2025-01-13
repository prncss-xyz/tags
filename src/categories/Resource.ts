import { focus, id, pipe, prop, valueOr } from '@constellar/core'

import { CategoryWithDefault } from '../category'
import { manyToMany } from '../relations'

export type IResource = Partial<{
	tags: string[]
}>

export const Resources = new CategoryWithDefault<string, IResource>('Resources', () => ({}))

export const fTags = focus<IResource>()(pipe(prop('tags'), valueOr<string[]>([])))

export const TagToResources = new CategoryWithDefault<string, string[]>(
	'TagToResources',
	() => [],
	{ index: true },
)

export const tagToResources = manyToMany(Resources, fTags.view.bind(fTags), TagToResources, id)
