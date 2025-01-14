import { focus, pipe, prop, valueOr } from '@constellar/core'

import { Category } from '../../category'

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

export const ChecksumToResources = Resources.oneToMany('ChecksumToResources', fChecksum)
export const TagToResources = Resources.manyToMany('TagToResources', fTags)
