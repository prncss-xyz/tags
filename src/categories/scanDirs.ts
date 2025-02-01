import { getDebouncedDeduped, isoAssert, zipCmp } from '@prncss-xyz/utils'
import { Dirent } from 'node:fs'
import { watch } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import { CategoryKey } from '../category'
import { getConfig } from '../config'
import { Entries, NumberToResources } from './Entry'
import { cmpPath, getPathPrism } from './Entry/pathPrism'
import { Resources } from './Resource'
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

function cmpEntry(a: CategoryKey<typeof Entries>, b: CategoryKey<typeof Entries>) {
	return a < b ? -1 : a > b ? 1 : 0
}

const debounceDelay = 1000

export async function scanDirs(w = false) {
	const pathPrism = getPathPrism((await getConfig()).dirs)
	const removed: CategoryKey<typeof Entries>[] = []
	await zipCmp(iterateDirs(), Entries.keys(), cmpEntry, function (a, b) {
		if (a === undefined) {
			isoAssert(b !== undefined)
			removed.push(b)
			return
		}
		scanFile(pathPrism.put(a))
	})
	for (const key of removed) {
		await Entries.remove(key)
	}
	if (w) {
		// We wait a little bit before removing unused entries to allow for renaming
		Entries.subscribe((event) => {
			if (event.next !== undefined) return
			const last = event.last
			isoAssert(last !== undefined)
			setTimeout(async () => {
				const unused = await NumberToResources.get('unused')
				if (!unused.includes(last.resource)) return
				Resources.remove(last.resource)
			}, 10 * debounceDelay)
		})
		const cb = getDebouncedDeduped(async (filePath: string) => {
			await scanFile(filePath)
		}, debounceDelay)
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
}
