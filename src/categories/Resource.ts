import { focus, pipe, prop, valueOr } from '@constellar/core'

import { CategoryWithCreate } from '../category'
import { createUUID } from '../utils/uuid'

type Pretty<T> = { [K in keyof T]: T[K] }

export type IResource = Pretty<
	Partial<Payload> & {
		checksum: string
		filePath: string
		mtime: number
	}
>

export const Resources = new CategoryWithCreate<
	string,
	IResource,
	{
		checksum: string
		filePath: string
		mtime: number
	}
>('Resources', (init) => [createUUID(), init])

interface Payload {
	tags: string[]
}
export const fTags = focus<IResource>()(pipe(prop('tags'), valueOr<string[]>([])))
