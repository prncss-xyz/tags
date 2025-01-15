import { flow } from '@constellar/core'
import { stat } from 'node:fs/promises'
import { resolve } from 'node:path/posix'

import {
	ChecksumToResources,
	fChecksum,
	fMtime,
	IResource,
	Resources,
} from '../categories/Resource'
import { getPathPrism } from '../categories/Resource/pathPrism'
import { getConfig } from '../config'
import { logger } from '../logger'
import { calculateChecksum } from './checksum'

function asyncPipe<A, B, C>(f: (a: A) => Promise<B>, g: (b: B) => Promise<C>) {
	return async (a: A) => await g(await f(a))
}

async function asyncIdentity<A>(a: A) {
	return a
}

export async function scanFile(filePath: string, mod = asyncIdentity<IResource | undefined>) {
	filePath = resolve(filePath)
	const config = await getConfig()
	const pathPrism = getPathPrism(config.dirs)
	const resourceKey = pathPrism.view(filePath)
	if (resourceKey === undefined) {
		logger.log(`file ${filePath} is not in a managed directory`)
		return undefined
	}
	return await Resources.modify(
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
				const lastResourceKeys = await ChecksumToResources.get(checksum)
				let lastResource: IResource | undefined = undefined
				for (const key of lastResourceKeys ?? []) {
					lastResource = await Resources.get(key)
					if (lastResource !== undefined) break
				}
				return lastResource ?? { checksum, mtime }
			}
			// we don't do simple equality to allow for the case where many machines share the same db and have different clocks
			if (last.mtime >= mtime) {
				return last
			}
			return flow(last, fMtime.update(mtime), fChecksum.update(await calculateChecksum(filePath)))
		}, mod),
	)
}
