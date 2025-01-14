import { focus, pipe, prop, to, valueOr } from '@constellar/core'

import { Category, FamilyToValue } from '../../category'

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
export const fNumber = focus<FamilyToValue<typeof ChecksumToResources>>()(
	to((cs) => {
		if (cs.length === 0) return 'zero'
		if (cs.length > 1) return 'plural'
		return undefined
	}),
)
export const NumberToChecksumToResources = ChecksumToResources.oneToMany(
	'NumberToChecksumToResources',
	fNumber,
)

export const TagToResources = Resources.manyToMany('TagToResources', fTags)
