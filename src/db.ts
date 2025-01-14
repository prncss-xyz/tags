import { Level } from 'level'
import path from 'node:path/posix'
import { xdgData } from 'xdg-basedir'

import { appName } from './appName'
import { logger } from './logger'
import { isoAssert } from './utils/isoAssert'

isoAssert(xdgData)
const dbPath = path.join(xdgData, appName, 'db')
export const db = new Level<unknown, unknown>(dbPath)

export function reset() {
	return db.clear()
}

export async function dump() {
	for await (const item of db.iterator()) {
		logger.log(item)
	}
}
