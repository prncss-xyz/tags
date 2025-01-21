import { focus, prop, to } from '@constellar/core'

import { category, CategoryKey, CategoryValue } from '../../category'
import { Resources } from '../Resource'

// encoded path is the key
export type IEntry = {
	mtime: number
	resource: CategoryKey<typeof Resources>
}

export const Entries = category('Entries')<IEntry>()

export const fResource = focus<IEntry>()(prop('resource'))
export const fMtime = focus<IEntry>()(prop('mtime'))

export const ResourceToEntries = Entries.oneToMany('ResourceToEntries', fResource)
const fNumber = focus<CategoryValue<typeof ResourceToEntries>>()(
	to((cs) => {
		if (cs.length === 0) return 'unused'
		if (cs.length > 1) return 'dupe'
		return undefined
	}),
)

export const NumberToResources = ResourceToEntries.oneToMany('NumberToResources', fNumber)
