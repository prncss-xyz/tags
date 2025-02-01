import { focus, pipe, prop } from '@constellar/core'
import { createUUID } from '@prncss-xyz/utils'

import { CategoryKey, categoryWithCreate } from '../category'
import { initLamportObj, LamportObject, lamportObjLens, toLamport } from './Lamport'
import { notify } from './Persistance'

export type ITag = LamportObject<{ name: string }>

export const Tags = categoryWithCreate('Tags')<ITag, string>((name) => {
	const uuid = createUUID()
	return [uuid, initLamportObj({ name }, (k, v) => notify('Tags', uuid, [k], toLamport(0), v))]
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const fObj = (key: CategoryKey<typeof Tags> = '' as any, lamport = toLamport(0)) =>
	focus<ITag>()(
		lamportObjLens(lamport, (k, v) => {
			notify(Tags.name, key, [k], lamport, v)
		}),
	)
export const fName = pipe(fObj, prop('name'))

export const NameToTags = Tags.oneToMany('NameToTag', fName())
