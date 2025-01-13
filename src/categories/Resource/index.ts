import { focus, id, pipe, prop, valueOr } from '@constellar/core'

import { Category, CategoryWithDefault } from '../../category'
import { manyToMany, oneToMany } from '../../relations'

export type IResource = Partial<{
	tags: string[]
}> & {
	checksum: string
	mtime: number
}

export const Resources = new Category<string, IResource>('Resources')

export const fTags = focus<IResource>()(pipe(prop('tags'), valueOr<string[]>([])))
export const fChecksum = focus<IResource>()(prop('checksum'))
export const fMtime = focus<IResource>()(prop('mtime'))

export const ChecksumToResources = new CategoryWithDefault<string, string[]>(
	'ChecksumToResources',
	() => [],
	{ index: true },
)
export const checksumToResources = oneToMany(
	Resources,
	fChecksum.view.bind(fChecksum),
	ChecksumToResources,
	id,
)

export const TagToResources = new CategoryWithDefault<string, string[]>(
	'TagToResources',
	() => [],
	{ index: true },
)

export const tagToResources = manyToMany(Resources, fTags.view.bind(fTags), TagToResources, id)
