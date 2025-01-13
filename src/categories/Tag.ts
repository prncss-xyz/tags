import { focus, pipe, prop, valueOr } from '@constellar/core'
import { id } from '@constellar/core'

import { CategoryWithCreate, CategoryWithDefault } from '../category'
import { oneToMany } from '../relations'
import { createUUID } from '../utils/uuid'

type Pretty<T> = { [K in keyof T]: T[K] }

export type ITag = Pretty<
	Partial<Payload> & {
		name: string
	}
>

export const Tags = new CategoryWithCreate<string, ITag, string>('Tags', (name) => [
	createUUID(),
	{
		name,
	},
])

interface Payload {
	implies: string[]
}

export const fName = focus<ITag>()(prop('name'))
export const fImplies = focus<ITag>()(pipe(prop('implies'), valueOr<string[]>([])))

export const NameToTags = new CategoryWithDefault<string, string[]>('NameToTag', () => [], {
	index: true,
})

export const nameToTags = oneToMany(Tags, fName.view.bind(fName), NameToTags, id)
