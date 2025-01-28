import { focus, iso } from '@constellar/core'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'

import { Lamport } from '../categories/Lamport'
import { Resources } from '../categories/Resource'
import { categories, CategoryKey } from '../category'
import { getConfig } from '../config'
import { logger } from '../logger'
import { lines } from '../utils/lines'

// TODO: could be a zip file, continuous stream and BSON
// TODO: could me more parallelized

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
	for await (const line of lines(path.join(dir, 'Lamport'))) {
		const [key, value] = codec.view(line)
		await Lamport.merge(key, value)
	}
	for (const [prefix, category] of categories) {
		if (category.index) continue
		if (prefix === 'Lamport') continue
		for await (const line of lines(path.join(dir, prefix))) {
			const [key, value] = codec.view(line)
			await category.merge(key, value)
		}
	}
}
