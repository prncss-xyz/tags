import { flow } from '@constellar/core'
import { stat } from 'node:fs/promises'
import { resolve } from 'node:path/posix'

import { getConfig } from '../config'
import { logger } from '../logger'
import { Entries, fMtime, fResource } from './Entry'
import { getPathPrism } from './Entry/pathPrism'
import { calculateChecksum } from './Resource/checksum'

export async function scanFile(filePath: string) {
	filePath = resolve(filePath)
	const config = await getConfig()
	const pathPrism = getPathPrism(config.dirs)
	const resourceKey = pathPrism.view(filePath)
	if (resourceKey === undefined) {
		logger.error(`file ${filePath} is not in a managed directory`)
		return undefined
	}
	return await Entries.modify(resourceKey, async (last) => {
		const mtime = await stat(filePath).then((stat) => stat.mtimeMs)
		if (last === undefined) {
			const checksum = await calculateChecksum(filePath)
			return { mtime, resource: checksum }
		}
		// we don't do simple equality to allow for the case where many machines share the same db and have different clocks
		if (last.mtime >= mtime) {
			return last
		}
		return flow(last, fMtime.update(mtime), fResource.update(await calculateChecksum(filePath)))
	})
}

export async function scanFileSafe(filePath: string) {
	try {
		scanFile(filePath)
	} catch (_e) {
		return undefined
	}
}
