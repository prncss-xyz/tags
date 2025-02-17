import { REMOVE } from '@constellar/core'

import { analyze } from '../analyse'
import { ResourceToEntries, ShouldAnalyze } from '../categories/Entry'
import { getPathPrism } from '../categories/Entry/pathPrism'
import { fMeta, Resources } from '../categories/Resource'
import { getConfig } from '../config'

export async function analyzeAll() {
	const config = await getConfig()
	const pathPrism = getPathPrism(config.dirs)
	for await (const resource of ShouldAnalyze.keys()) {
		const entries = await ResourceToEntries.get(resource)
		const entry = entries[0]
		if (!entry) continue
		const path = pathPrism.put(entry)
		const meta = await analyze(path)
		Resources.map(resource, fMeta.update(meta === undefined ? REMOVE : meta))
		await ShouldAnalyze.remove(resource)
	}
}
