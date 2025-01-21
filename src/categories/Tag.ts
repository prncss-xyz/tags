import { focus, prop } from '@constellar/core'

import { categoryWithCreate } from '../category'
import { createUUID } from '../utils/uuid'
import { ILamport, incLamport, initLamport, lamportMerge } from './Lamport'

export type ITag = ILamport & {
	name: string
}

export const Tags = categoryWithCreate('Tags')<ITag, string>(
	(name) => [
		createUUID(),
		initLamport({
			name,
		}),
	],
	{
		merge: lamportMerge,
		rewrite: incLamport,
	},
)

export const fName = focus<ITag>()(prop('name'))

export const NameToTags = Tags.oneToMany('NameToTag', fName)
