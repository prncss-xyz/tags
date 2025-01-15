import { focus, prop, to } from '@constellar/core'

import { Category, FamilyToValue } from '../../category'

// key is the processed path
export type IEntry = {
	mtime: number
	resource: string
}

export const Entries = new Category<string, IEntry>('Entries')

export const fResource = focus<IEntry>()(prop('resource'))
export const fMtime = focus<IEntry>()(prop('mtime'))

export const ResourceToEntry = Entries.oneToMany('ResourceToEntry', fResource)
export const fDupe = focus<FamilyToValue<typeof ResourceToEntry>>()(
	to((cs) => {
		if (cs.length > 1) return 'dupe'
		return undefined
	}),
)

export const DupeToResourceToEntry = ResourceToEntry.oneToMany('DupeToResourceToEntry', fDupe)
