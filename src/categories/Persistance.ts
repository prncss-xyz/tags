import { focus, iso } from '@constellar/core'
import { mkdir, readdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { z } from 'zod'

const ext = '.dump'

import { getDeviceId } from '../categories/deviceId'
import { mergeWithPath, notifyUsedLamport, TLamport, toLamport } from '../categories/Lamport'
import { categories, categoryWithDefault } from '../category'
import { getConfig } from '../config'
import { logger } from '../logger'
import { lines } from '../utils/lines'

const Persistence = categoryWithDefault('Persistence')<TLamport, string>(() => toLamport(0), {
	index: true,
})

const EntrySchema = z.object({
	category: z.string(),
	key: z.string(),
	lamport: z.number().transform(toLamport),
	path: z.array(z.string()),
	payload: z.unknown(),
})

type Entry = z.infer<typeof EntrySchema>

const codec = focus<string>()(
	iso({
		getter: (part) => JSON.parse(part),
		setter: (whole) => JSON.stringify(whole),
	}),
)

async function getFilePath() {
	const config = await getConfig()
	const feed = config.feed
	if (!feed) return
	const resolved = resolve(process.env.HOME!, feed)
	await mkdir(resolved, { recursive: true })
	return resolve(resolved, (await getDeviceId()) + ext)
}

const filePathPromise = getFilePath()

export async function notify(
	category: string,
	key: string,
	path: string[],
	lamport: TLamport,
	payload: unknown,
) {
	const filePath = await filePathPromise
	if (!filePath) return
	await writeFile(
		filePath,
		codec.put({ category, key, lamport, path, payload } satisfies Entry) + '\n',
		{
			flag: 'a',
		},
	)
}

async function syncId(filePath: string, deviceId: string) {
	const prioritizeLocal = deviceId < (await getDeviceId())
	const min = await Persistence.get(deviceId)
	let max = min
	for await (const line of lines(filePath)) {
		const entry = EntrySchema.parse(codec.view(line))
		if (entry.lamport <= min) continue
		max = toLamport(Math.max(max, entry.lamport))
		const category = categories.get(entry.category)
		if (category === undefined) {
			logger.error(`invalid category in entry ${entry}`)
			return
		}
		await category.modify(entry.key, (local: unknown) =>
			mergeWithPath(prioritizeLocal, notifyUsedLamport, local, entry.path, {
				lamport: entry.lamport,
				payload: entry.payload,
			}),
		)
	}
	await Persistence.put(deviceId, max)
}

export async function sync() {
	const config = await getConfig()
	const thisDeviceId = await getDeviceId()
	const feed = config.feed
	if (!feed) return
	const dir = await readdir(feed)
	for (const file of dir) {
		if (!file.endsWith(ext)) continue
		const filePath = resolve(feed, file)
		const deviceId = file.slice(0, -ext.length)
		if (deviceId === thisDeviceId) continue
		await syncId(filePath, deviceId)
	}
}
