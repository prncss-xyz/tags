import { focus, pipe, prop } from '@constellar/core'

import { CategoryKey, categoryWithDefault } from '../../category'
import { initLamportObj, LamportObject, lamportObjLens, lamportZero, recordToSet } from '../Lamport'
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const fTags = (key: CategoryKey<typeof Resources> = '' as any, lamport = lamportZero) =>
	focus<IResource>()(
		pipe(
			prop('tags'),
			lamportObjLens<TagRecord>(lamport, (k, v) => {
				notify(Resources.name, key, ['tags', k], lamport, v)
			}),
			recordToSet(),
		),
	)

export const TagsToResources = Resources.manyToMany('TagsToResources', fTags())
