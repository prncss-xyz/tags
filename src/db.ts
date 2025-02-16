import { isoAssert } from '@prncss-xyz/utils'
import { Level } from 'level'
import path from 'node:path/posix'
import { xdgData } from 'xdg-basedir'

import { appName } from './appName'

isoAssert(xdgData)
const dbPath = path.join(
	process.env.TEST === 'TEST' ? `/tmp/${appName}/db` : xdgData,
	appName,
	'levelDB',
)
export const db = new Level<unknown, unknown>(dbPath)

export function reset() {
	return db.clear()
}
