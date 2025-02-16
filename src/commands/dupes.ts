import { unlink } from 'node:fs/promises'

import { DupesToResources, Entries, ResourceToEntries } from '../categories/Entry'
import { getPathPrism } from '../categories/Entry/pathPrism'
import { getConfig } from '../config'
import { logger } from '../logger'

export async function dupes() {
	const pathPrism = getPathPrism((await getConfig()).dirs)
	for await (const dupe of DupesToResources.keys()) {
		const entries = await ResourceToEntries.get(dupe)
		for (const entry of entries) {
			logger.log(pathPrism.put(entry))
		}
		logger.log()
	}
}

export async function dedupe() {
	const pathPrism = getPathPrism((await getConfig()).dirs)
	for await (const dupe of DupesToResources.keys()) {
		const entries = await ResourceToEntries.get(dupe)
		await Promise.all(
			entries.slice(1).map((entry) => {
				Entries.remove(entry)
				return unlink(pathPrism.put(entry))
			}),
		)
	}
}
