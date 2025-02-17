import { focus, pipe, prop } from '@constellar/core'

import { Meta } from '../../analyse'
import { CategoryKey, categoryWithDefault } from '../../category'
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
	meta?: Meta
	tags: LamportObject<TagRecord>
}

export const Resources = categoryWithDefault('Resources')<IResource>(() => ({
	tags: initLamportObj({}),
}))

export const fMeta = focus<IResource>()(prop('meta'))

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
