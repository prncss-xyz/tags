import { focus, pipe, prop } from '@constellar/core'

import { CategoryKey, categoryWithDefault } from '../../category'
import { Entries } from '../Entry'
import {
	initLamportObj,
	LamportObject,
	lamportObjLens,
	recordToSet,
	TLamport,
	toLamport,
} from '../Lamport'
import { notify } from '../Persistance'
import { Tags } from '../Tag'

type TagRecord = Record<CategoryKey<typeof Tags>, boolean>

// checksum is the key
export type IResource = {
	tags: LamportObject<TagRecord>
}

export const Resources = categoryWithDefault('Resources')<IResource>(() => ({
	tags: initLamportObj({}),
}))

export const fTags = (key: CategoryKey<typeof Resources>, lamport: TLamport) =>
	focus<IResource>()(
		pipe(
			prop('tags'),
			lamportObjLens<TagRecord>(lamport, (k, v) => {
				notify(Resources.name, key, ['tags', k], lamport, v)
			}),
			recordToSet(),
		),
	)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const fTagsGet = fTags('' as any, toLamport(0))

export const TagsToResources = Resources.manyToMany('TagsToResources', fTagsGet)
export const UntaggedResources = Resources.oneToIndex(
	'UntaggedResources',
	(r) => fTagsGet.view(r).length === 0,
)
Entries.subscribe(({ last, next }) => {
	const l = last?.resource
	const n = next?.resource
	if (n === undefined && l !== undefined) UntaggedResources.remove(l)
	if (l === undefined && n !== undefined) UntaggedResources.put(n, true)
})
