import { focus, prism } from '@constellar/core'

import { Entries } from '.'
import { CategoryKey } from '../../category'
import { isoAssert } from '../../utils/isoAssert'

const pathSep = '/'
const keySep = ' '

export function cmpPath(a: string, b: string) {
	const a_ = encodeURIComponent(a)
	const b_ = encodeURIComponent(b)
	if (a_ < b_) return -1
	if (a_ > b_) return 1
	return 0
}

export function getPathPrism(dirs: Record<string, string>) {
	function getter(rawPath: string) {
		for (const [dir, head] of Object.entries(dirs)) {
			if (rawPath.startsWith(head)) {
				const tail = rawPath.slice(head.length + 1).split(pathSep)
				return [dir, ...tail].map(encodeURIComponent).join(keySep) as CategoryKey<typeof Entries>
			}
		}
		return undefined
	}
	function setter(key: CategoryKey<typeof Entries>) {
		const [head, ...tail] = key.split(keySep)
		isoAssert(head !== undefined, 'path must start with a dir reference')
		const base = dirs[head]
		isoAssert(base !== undefined, `dir ${head} not found in dirs`)
		return [base, ...tail].map(decodeURIComponent).join(pathSep)
	}
	return focus<string>()(prism({ getter, setter }))
}
