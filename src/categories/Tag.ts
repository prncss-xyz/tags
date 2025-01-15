import { focus, prop } from '@constellar/core'

import { CategoryWithCreate } from '../category'
import { createUUID } from '../utils/uuid'

export type ITag = {
	name: string
}

export const Tags = new CategoryWithCreate<string, ITag, string>('Tags', (name) => [
	createUUID(),
	{
		name,
	},
])

export const fName = focus<ITag>()(prop('name'))

export const NameToTags = Tags.oneToMany('NameToTag', fName)
