import { pipe } from '@constellar/core'
import assert from 'node:assert'
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
import { log } from '../log'
import { calculateChecksum } from './checksum'

export async function scanFile(filePath: string) {
	filePath = resolve(filePath)
	const config = await getConfig()
	const pathPrism = getPathPrism(config.dirs)
	const resourceKey = pathPrism.view(filePath)
	if (resourceKey === undefined) {
		log.log(`file ${filePath} is not in a managed directory`)
		return undefined
	}
	let mtime: number
	try {
		mtime = await stat(filePath).then((stat) => stat.mtimeMs)
	} catch (_e) {
		return undefined
	}
	const resource = await Resources.get(resourceKey)
	if (resource === undefined) {
		const checksum = await calculateChecksum(filePath)
		const lastResourceKeys = await ChecksumToResources.get(checksum)
		let lastResource: IResource | undefined = undefined
		for (const key of lastResourceKeys ?? []) {
			lastResource = await Resources.get(key)
			if (lastResource !== undefined) break
		}
		Resources.put(resourceKey, lastResource ?? { checksum, mtime })
		return resourceKey
	}
	// we don't do simple equality to allow for the case where many machines share the same db and have different clocks
	if (resource.mtime >= mtime) {
		return resourceKey
	}
	await Resources.update(
		resourceKey,
		pipe(fMtime.update(mtime), fChecksum.update(await calculateChecksum(filePath))),
	)
	return resourceKey
}

export async function modFile(filePath: string, mode: (r: IResource) => IResource) {
	const key = await scanFile(filePath)
	if (key === undefined) {
		log.error('file not found', filePath)
		return
	}
	return Resources.update(key, mode)
}

export async function getFile<T>(filePath: string, select: (r: IResource) => T) {
	const key = await scanFile(filePath)
	if (key === undefined) {
		log.error('file not found', filePath)
		return
	}
	const resource = await Resources.get(key)
	assert(resource !== undefined)
	return select(resource)
}
