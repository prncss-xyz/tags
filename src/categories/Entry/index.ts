import { focus, pipe, prop } from '@constellar/core'

import { category, CategoryKey } from '../../category'
import { Resources } from '../Resource'

// encoded path is the key
export type IEntry = {
	bTime: number
	mTime: number
	resource: CategoryKey<typeof Resources>
}

export const Entries = category('Entries')<IEntry>()

export const fResource = focus<IEntry>()(prop('resource'))
export const fMTime = focus<IEntry>()(prop('mTime'))
export const fBTime = focus<IEntry>()(pipe(prop('bTime')))

export const ResourceToEntries = Entries.oneToMany('ResourceToEntries', fResource)

export const UnusedToResources = ResourceToEntries.oneToIndex(
	'UnusedToResources',
	(cs) => cs.length === 0,
)

export const DupesToResources = ResourceToEntries.oneToIndex(
	'DupesToResources',
	(cs) => cs.length > 1,
)
