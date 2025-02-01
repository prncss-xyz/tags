import { isoAssert } from '@prncss-xyz/utils'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { xdgConfig } from 'xdg-basedir'
import { parse } from 'yaml'
import { z } from 'zod'

import { appName } from './appName'
import { logger } from './logger'

const home = process.env.HOME

const ConfigSchema = z.object({
	dirs: z.record(z.string()).transform((record) => {
		isoAssert(home)
		for (const [key, value] of Object.entries(record)) {
			record[key] = path.resolve(home, value)
		}
		return record
	}),
	export: z.optional(z.string()),
	feed: z.optional(z.string()),
})

async function getConfig_() {
	const config = xdgConfig
	isoAssert(config, 'xdgConfig not found')
	let raw: string | undefined
	const filePath = config + `/${appName}/config.yaml`
	try {
		raw = await readFile(filePath, 'utf8')
	} catch (_e) {
		logger.log(`config not found at ${filePath}`)
		process.exit(1)
	}
	return ConfigSchema.parse(parse(raw))
}

const config = getConfig_()

const testConfig: z.infer<typeof ConfigSchema> = {
	dirs: {
		downloads: 'Downloads',
	},
	export: '/tmp/tags/export',
	feed: '/tmp/tags/feed',
}

export function getConfig() {
	if (process.env.TEST === 'TEST') return testConfig
	return config
}
