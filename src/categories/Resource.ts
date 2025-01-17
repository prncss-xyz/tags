import { focus, prop } from '@constellar/core'

import { categoryWithDefault, CategoryKey } from '../category'
import { Tags } from './Tag'

// key is the checksum
export type IResource = {
	tags: CategoryKey<typeof Tags>[]
}

export const Resources = categoryWithDefault('Resources')<IResource>(
	() => ({
		tags: [],
	}),
	(value) => value.tags.length === 0,
)

export const fTags = focus<IResource>()(prop('tags'))

export const TagsToResources = Resources.manyToMany('TagsToResources', fTags)
