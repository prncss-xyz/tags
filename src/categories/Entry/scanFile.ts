import { flow } from '@constellar/core'
import { stat } from 'node:fs/promises'
import { resolve } from 'node:path/posix'

import { Entries, fMtime, fResource, IEntry } from '.'
import { getConfig } from '../../config'
import { calculateChecksum } from './checksum'
import { getPathPrism } from './pathPrism'

function asyncPipe<A, B, C>(f: (a: A) => Promise<B>, g: (b: B) => Promise<C>) {
	return async (a: A) => await g(await f(a))
}

async function asyncIdentity<A>(a: A) {
	return a
}

export async function scanFile(filePath: string, mod = asyncIdentity<IEntry | undefined>) {
	filePath = resolve(filePath)
	const config = await getConfig()
	const pathPrism = getPathPrism(config.dirs)
	const resourceKey = pathPrism.view(filePath)
	if (resourceKey === undefined) return undefined
	return await Entries.modify(
		resourceKey,
		asyncPipe(async (last) => {
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
		}, mod),
	)
}
