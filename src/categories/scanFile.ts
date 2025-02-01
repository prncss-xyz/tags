import { stat } from 'node:fs/promises'
import { resolve } from 'node:path/posix'

import { getConfig } from '../config'
import { logger } from '../logger'
import { Entries } from './Entry'
import { getPathPrism } from './Entry/pathPrism'
import { calculateChecksum } from './Resource/checksum'

export async function scanFile(filePath: string, force?: boolean) {
	filePath = resolve(filePath)
	const config = await getConfig()
	const pathPrism = getPathPrism(config.dirs)
	const resourceKey = pathPrism.view(filePath)
	if (resourceKey === undefined) {
		logger.error(`file ${filePath} is not in a managed directory`)
		return undefined
	}
	return await Entries.modify(resourceKey, async (last) => {
		const { birthtimeMs: bTime, mtimeMs: mTime } = await stat(filePath)
		// we don't do simple equality to allow for the case where many machines share the same db and have different clocks
		if (last === undefined || force || last.mTime >= mTime) {
			const checksum = await calculateChecksum(filePath)
			return { bTime, mTime, resource: checksum }
		}
		return last
	})
}

export async function scanFileSafe(filePath: string, force?: boolean) {
	try {
		scanFile(filePath, force)
	} catch (_e) {
		return undefined
	}
}
