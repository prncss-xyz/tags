import { focus, pipe, prop } from '@constellar/core'
import { createUUID } from '@prncss-xyz/utils'

import { CategoryKey, categoryWithCreate } from '../category'
import { initLamportObj, LamportObject, lamportObjLens, lamportZero } from './Lamport'
import { notify } from './Persistance'

export type ITag = LamportObject<{ name: string }>

export const Tags = categoryWithCreate('Tags')<ITag, string>((name) => [
	createUUID(),
	initLamportObj({ name }),
])

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const fObj = (key: CategoryKey<typeof Tags> = '' as any, lamport = lamportZero) =>
	focus<ITag>()(
		lamportObjLens(lamport, (k, v) => {
			notify(Tags.name, key, [k], lamport, v)
		}),
	)
export const fName = pipe(fObj, prop('name'))

export const NameToTags = Tags.oneToMany('NameToTag', fName())
