import { focus, prop } from '@constellar/core'

import { CategoryKey, categoryWithDefault } from '../../category'
import { ILamport, initLamport, mergeLamport, updateLamport } from '../Lamport'
import { Tags } from '../Tag'

// checksum is the key
export type IResource = ILamport & {
	tags: CategoryKey<typeof Tags>[]
}

export const Resources = categoryWithDefault('Resources')<IResource>(
	() =>
		initLamport({
			tags: [],
		}),
	{
		merge: mergeLamport,
		rewrite: updateLamport,
	},
)

export const fTags = focus<IResource>()(prop('tags'))

export const TagsToResources = Resources.manyToMany('TagsToResources', fTags)
