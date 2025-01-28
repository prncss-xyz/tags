import { focus, prop } from '@constellar/core'
import { createUUID } from '@prncss-xyz/utils'

import { categoryWithCreate } from '../category'
import { ILamport, initLamport, mergeLamport, updateLamport } from './Lamport'

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
		merge: mergeLamport,
		rewrite: updateLamport,
	},
)

export const fName = focus<ITag>()(prop('name'))

export const NameToTags = Tags.oneToMany('NameToTag', fName)
