import assert from 'node:assert'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { xdgConfig } from 'xdg-basedir'
import { parse } from 'yaml'
import { z } from 'zod'

import { appName } from './appName'

const home = process.env.HOME

const ConfigSchema = z.object({
	dirs: z.record(z.string()).transform((record) => {
		assert(home)
		for (const [key, value] of Object.entries(record)) {
			record[key] = path.resolve(home, value)
		}
		return record
	}),
})

async function getConfig_() {
	const config = xdgConfig
	assert(config, 'xdgConfig not found')
	let raw: string | undefined
	const filePath = config + `/${appName}/config.yaml`
	try {
		raw = await readFile(filePath, 'utf8')
	} catch (_e) {
		console.log(`config not found at ${filePath}`)
		process.exit(1)
	}
	return ConfigSchema.parse(parse(raw))
}

const config = getConfig_()

export function getConfig() {
	return config
}
