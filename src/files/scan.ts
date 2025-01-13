import assert from 'node:assert'
import { stat } from 'node:fs/promises'

import { FileEntry } from '../categories/FileEntry'
import { IResource, Resources } from '../categories/Resource'
import { merge } from '../utils/objects'
import { calculateChecksum } from './checksum'

export async function scanFile(filePath: string) {
	let mtime: number
	try {
		mtime = await stat(filePath).then((stat) => stat.mtimeMs)
	} catch (_e) {
		return undefined
	}
	const fileEntry = await FileEntry.get(filePath)
	if (fileEntry === undefined) {
		const checksum = await calculateChecksum(filePath)
		FileEntry.put(filePath, {
			mtime,
			resource: checksum,
		})
		return checksum
	}
	if (fileEntry.mtime === mtime) {
		return fileEntry.resource
	}
	const checksum = await calculateChecksum(filePath)
	if (fileEntry.resource === checksum) {
		return checksum
	}
	const last = await Resources.get(checksum)
	const next = merge<IResource>({}, last)
	await Resources.put(checksum, next)
	return checksum
}

export async function modFile(filePath: string, mode: (r: IResource) => IResource) {
	const key = await scanFile(filePath)
	if (key === undefined) {
		console.error('file not found', filePath)
		return
	}
	return Resources.update(key, mode)
}

export async function getFile<T>(filePath: string, select: (r: IResource) => T) {
	const key = await scanFile(filePath)
	if (key === undefined) {
		console.error('file not found', filePath)
		return
	}
	const resource = await Resources.get(key)
	assert(resource !== undefined)
	return select(resource)
}
