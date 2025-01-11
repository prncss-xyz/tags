import { Level } from 'level'
import assert from 'node:assert'
import path from 'node:path/posix'
import { xdgData } from 'xdg-basedir'

assert(xdgData)
const dbPath = path.join(xdgData, 'tags', 'db')
export const db = new Level<unknown, unknown>(dbPath)

export function reset() {
	return db.clear()
}

export async function dump() {
	for await (const item of db.iterator()) {
		console.log(item)
	}
}
