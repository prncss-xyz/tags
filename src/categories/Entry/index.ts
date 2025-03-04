import { focus, pipe, prop } from '@constellar/core'

import { shouldAnalyze } from '../../analyse'
import { category, CategoryKey } from '../../category'
import { fTagsGet, Resources } from '../Resource'

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

export const ShouldAnalyze = ResourceToEntries.oneToIndex('ShouldAnalyze', (cs) =>
	cs.some(shouldAnalyze),
)

export const UnusedToResources = ResourceToEntries.oneToIndex(
	'UnusedToResources',
	(cs) => cs.length === 0,
)

export const DupesToResources = ResourceToEntries.oneToIndex(
	'DupesToResources',
	(cs) => cs.length > 1,
)

export const UntaggedResources = Resources.oneToIndex(
	'UntaggedResources',
	(r) => fTagsGet.view(r).length === 0,
)

Entries.subscribe(({ last, next }) => {
	const l = last?.resource
	const n = next?.resource
	if (n === undefined && l !== undefined) UntaggedResources.remove(l)
	if (l === undefined && n !== undefined) UntaggedResources.put(n, true)
})
