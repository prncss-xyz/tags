import assert from 'assert'
import { stat } from 'fs/promises'

import { ChecksumToResource } from '../categories/ChecksumToResource'
import { PathToResource } from '../categories/PathToResource'
import { IResource, Resources } from '../categories/Resource'
import { calculateChecksum } from './checksum'

// TODO: file not found
export async function scanFile(filePath: string) {
	const mtime = await stat(filePath).then((stat) => stat.mtimeMs)
	let key = await PathToResource.get(filePath)
	if (key === undefined) {
		const checksum = await calculateChecksum(filePath)
		key = await ChecksumToResource.get(checksum)
		if (key === undefined) {
			key = await Resources.create({
				checksum,
				filePath,
				mtime,
			})
		}
	} else {
		const last = await Resources.get(key)
		assert(last !== undefined)
		if (last.mtime !== mtime) {
			const checksum = await calculateChecksum(filePath)
			await Resources.update(key, (last) => ({
				...last,
				checksum,
				mtime,
			}))
		}
	}
	return key
}

export async function modFile(filePath: string, mode: (r: IResource) => IResource) {
	const key = await scanFile(filePath)
	return Resources.update(key, mode)
}

export async function getFile<T>(filePath: string, select: (r: IResource) => T) {
	const key = await scanFile(filePath)
	const resource = await Resources.get(key)
	if (resource === undefined) {
		return undefined
	}
	return select(resource)
}
