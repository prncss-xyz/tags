import { flow, pipe } from '@constellar/core'
import { pro } from '@prncss-xyz/utils'
import { stat } from 'node:fs/promises'
import { resolve } from 'node:path/posix'

import { getConfig } from '../config'
import { Entries, fMtime, fResource, IEntry } from './Entry'
import { getPathPrism } from './Entry/pathPrism'
import { calculateChecksum } from './Resource/checksum'

export async function scanFile(filePath: string, mod = pro.unit<IEntry | undefined>) {
	filePath = resolve(filePath)
	const config = await getConfig()
	const pathPrism = getPathPrism(config.dirs)
	const resourceKey = pathPrism.view(filePath)
	if (resourceKey === undefined) return undefined
	return await Entries.modify(
		resourceKey,
		pipe(async (last) => {
			let mtime: number
			try {
				mtime = await stat(filePath).then((stat) => stat.mtimeMs)
			} catch (_e) {
				return undefined
			}
			if (last === undefined) {
				const checksum = await calculateChecksum(filePath)
				return { mtime, resource: checksum }
			}
			// we don't do simple equality to allow for the case where many machines share the same db and have different clocks
			if (last.mtime >= mtime) {
				return last
			}
			return flow(last, fMtime.update(mtime), fResource.update(await calculateChecksum(filePath)))
		}, pro.chain(mod)),
	)
}
