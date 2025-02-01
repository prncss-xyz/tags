import { Dirent } from 'node:fs'
import { lstat, readdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { logger } from '../../logger'
import { cmpPath } from './pathPrism'

export async function* walkDirOrFiles(pathNames: string[]) {
	for (const pathName of pathNames) {
		yield* walkDirOrFile(pathName)
	}
}

export async function* walkDirOrFile(pathName: string) {
	try {
		const stat = await lstat(pathName)
		if (stat.isFile()) {
			yield pathName
			return
		}
		if (stat.isDirectory()) {
			yield* walkDir(pathName)
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

export async function* walkList(pathName: string) {
	const dir = dirname(pathName)
	const content = await readFile(pathName, { encoding: 'utf8' })
	for (const line of content.split('\n')) {
		yield join(dir, line)
	}
}

function cmp(a: Dirent, b: Dirent) {
	return cmpPath(a.name, b.name)
}

export async function* walkDir(dir: string): AsyncIterable<string> {
	const entries = await readdir(dir, { withFileTypes: true })
	entries.sort(cmp)
	for (const entry of entries) {
		if (entry.name.startsWith('.')) continue
		if (entry.isDirectory()) {
			yield* walkDir(join(dir, entry.name))
			continue
		}
		yield join(dir, entry.name)
	}
}
