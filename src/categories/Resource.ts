import { focus, prop } from '@constellar/core'

import { CategoryWithDefault } from '../category'

// key is the checksum
export type IResource = {
	tags: string[]
}

export const Resources = new CategoryWithDefault<string, IResource>(
	'Resources',
	() => ({
		tags: [],
	}),
	(_, value) => value.tags.length === 0,
)

export const fTags = focus<IResource>()(prop('tags'))

export const TagsToResources = Resources.manyToMany('TagsToResources', fTags)
