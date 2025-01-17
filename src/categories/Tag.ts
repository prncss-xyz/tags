import { focus, prop } from '@constellar/core'

import { categoryWithCreate } from '../category'
import { createUUID } from '../utils/uuid'

export type ITag = {
	name: string
}

export const Tags = categoryWithCreate('Tags')<ITag, string>((name) => [
	createUUID(),
	{
		name,
	},
])

export const fName = focus<ITag>()(prop('name'))

export const NameToTags = Tags.oneToMany('NameToTag', fName)
