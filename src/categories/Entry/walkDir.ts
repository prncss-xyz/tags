import { Dirent } from 'node:fs'
import { lstat, readdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { logger } from '../../logger'
import { cmpPath } from './pathPrism'

export async function walkDirOrFiles(pathNames: string[], cb: (file: string) => Promise<void>) {
	for (const pathName of pathNames) {
		await walkDirOrFile(pathName, cb)
	}
}

export async function walkDirOrFile(pathName: string, cb: (file: string) => Promise<void>) {
	try {
		const stat = await lstat(pathName)
		if (stat.isFile()) {
			await cb(pathName)
			return
		}
		if (stat.isDirectory()) {
			await walkDir(pathName, cb)
			return
		}
	} catch (e) {
		if (typeof e === 'object' && e !== null && 'code' in e && e.code === 'ENOENT') {
			logger.error(`file not found: ${pathName}`)
			process.exit(1)
		}
		throw e
	}
}

export async function walkList(pathName: string, cb: (file: string) => Promise<void>) {
	const dir = dirname(pathName)
	const content = await readFile(pathName, { encoding: 'utf8' })
	for (const line of content.split('\n')) {
		await cb(join(dir, line))
	}
}

function cmp(a: Dirent, b: Dirent) {
	return cmpPath(a.name, b.name)
}

export async function walkDir(dir: string, cb: (file: string) => Promise<void>) {
	const entries = await readdir(dir, { withFileTypes: true })
	entries.sort(cmp)
	for (const entry of entries) {
		if (entry.name.startsWith('.')) continue
		if (entry.isDirectory()) {
			await walkDir(join(dir, entry.name), cb)
			continue
		}
		await cb(join(dir, entry.name))
	}
}
