import { NumberToResources, ResourceToEntries } from '../categories/Entry'
import { getPathPrism } from '../categories/Entry/pathPrism'
import { getConfig } from '../config'
import { logger } from '../logger'

export async function dupes() {
	const pathPrism = getPathPrism((await getConfig()).dirs)
	const dupes = await NumberToResources.get('dupe')
	for (const dupe of dupes) {
		const entries = await ResourceToEntries.get(dupe)
		for (const entry of entries) {
			logger.log(pathPrism.put(entry))
		}
		logger.log()
	}
}
