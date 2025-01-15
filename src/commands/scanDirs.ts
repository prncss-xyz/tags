import { Dirent } from 'node:fs'
import { watch } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import { DupeToChecksumToResources, Resources } from '../categories/Resource'
import { cmpPath, getPathPrism } from '../categories/Resource/pathPrism'
import { getConfig } from '../config'
import { isoAssert } from '../utils/isoAssert'
import { zipCmp } from '../utils/iterators'
import { getDeduper } from '../utils/time'
import { scanFile } from './scanFile'

function cmp(a: Dirent, b: Dirent) {
	return cmpPath(a.name, b.name)
}

async function* iterateDir(dir: string): AsyncGenerator<string> {
	const entries = await readdir(dir, { withFileTypes: true })
	entries.sort(cmp)
	for (const entry of entries) {
		if (entry.name.startsWith('.')) continue
		if (entry.isDirectory()) {
			for await (const file of iterateDir(join(dir, entry.name))) {
				yield file
			}
			continue
		}
		yield join(dir, entry.name)
	}
}

async function* iterateDirs() {
	const config = await getConfig()
	const dirs = config.dirs
	const pathPrism = getPathPrism(dirs)
	let last = ''
	const names = Object.keys(dirs)
	names.sort()
	for (const name of names) {
		const pathName = dirs[name]!
		for await (const file of iterateDir(pathName)) {
			const key = pathPrism.view(file)
			isoAssert(key)
			isoAssert(last === '' || key > last, `${key} > ${last}`)
			yield key
			last = key
		}
	}
}

function cmpEntry(a: string, b: string) {
	return a < b ? -1 : a > b ? 1 : 0
}

export async function scanDirs(w = false) {
	// we setup the watcher first, as files can be touched before all notes have been scanned
	if (w) {
		const cb = getDeduper((filePath: string) => {
			console.log('%s touched', filePath)
			scanFile(filePath)
		}, 1000)
		const config = await getConfig()
		for (const dir of Object.values(config.dirs)) {
			watch(dir, { persistent: true, recursive: true }, (_event, filePath) => {
				if (filePath === null) return
				filePath = resolve(dir, filePath)
				if (filePath.split('/').some((s) => s.startsWith('.'))) return
				cb(filePath)
			})
		}
	}
	const pathPrism = getPathPrism((await getConfig()).dirs)
	const removed: string[] = []
	await zipCmp(iterateDirs(), Resources.keys(), cmpEntry, function (a, b) {
		if (a === undefined) {
			isoAssert(b !== undefined)
			removed.push(b)
			return
		}
		scanFile(pathPrism.put(a))
	})
	for (const key of removed) {
		await Resources.remove(key)
	}
	// TODO: remove checksums that are no longer in the filesystem
}
