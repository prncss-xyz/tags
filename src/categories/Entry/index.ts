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

export const ResourceToEntries = Entries.oneToMany('ResourceToEntries', fResource)
const fNumber = focus<FamilyToValue<typeof ResourceToEntries>>()(
	to((cs) => {
		if (cs.length === 0) return 'unused'
		if (cs.length > 1) return 'dupe'
		return undefined
	}),
)

export const NumberToResources = ResourceToEntries.oneToMany('NumberToResources', fNumber)
