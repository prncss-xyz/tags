import { focus, prop } from '@constellar/core'

import { CategoryWithCreate } from '../category'
import { createUUID } from '../utils/uuid'

type Pretty<T> = { [K in keyof T]: T[K] }

export type ITag = Pretty<{
	name: string
}>

export const Tags = new CategoryWithCreate<string, ITag, string>('Tags', (name) => [
	createUUID(),
	{
		name,
	},
])

export const fName = focus<ITag>()(prop('name'))

export const NameToTags = Tags.oneToMany('NameToTag', fName)
