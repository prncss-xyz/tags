import { focus, iso } from '@constellar/core'
import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'

import { Resources } from '../categories/Resource'
import { categories, CategoryKey } from '../category'
import { getConfig } from '../config'
import { logger } from '../logger'

// TODO: could be a zip file, continuous stream and BSON

const codec = focus<string>()(
	iso({
		getter: (part) => JSON.parse(part),
		setter: (whole) => JSON.stringify(whole),
	}),
)

export async function exportData() {
	const config = await getConfig()
	let exp = config.export
	if (!exp) {
		logger.error('export is not configured')
		process.exit(1)
	}
	exp = path.resolve(
		process.env.HOME!,
		exp,
		`${new Date().toISOString()}-${process.env.HOST ?? 'unknown'}`,
	)
	await mkdir(exp, { recursive: true })
	for (const [prefix, category] of categories) {
		if (category.index) continue
		if (prefix === 'Entries') {
			for await (const entry of category.list()) {
				const resource = entry[1].resource as CategoryKey<'Resources'>
				if (await Resources.has(resource))
					await writeFile(path.join(exp, prefix), codec.put(entry), { flag: 'a' })
			}
			continue
		}
		for await (const entry of category.list()) {
			await writeFile(path.join(exp, prefix), codec.put(entry), { flag: 'a' })
		}
	}
}

export async function importData(dir: string) {
	dir = path.resolve(dir)
	for (const [prefix, category] of categories) {
		if (category.index) continue
		const contents = await readFile(path.join(dir, prefix), { encoding: 'utf8' })
		for (const line of contents.split('\n')) {
			const [key, value] = codec.view(line)
			await category.put(key, value)
		}
	}
}
