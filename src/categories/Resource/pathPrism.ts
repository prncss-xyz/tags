import { focus, prism } from '@constellar/core'

import { isoAssert } from '../../utils/isoAssert'

const pathSep = '/'
const keySep = ' '

export function getPathPrism(dirs: Record<string, string>) {
	function setter(rawPath: string) {
		const [head, ...tail] = rawPath.split(keySep)
		isoAssert(head !== undefined, 'path must start with a dir reference')
		const base = dirs[head]
		isoAssert(base !== undefined, `dir ${head} not found in dirs`)
		return [base, ...tail].map(decodeURI).join(pathSep)
	}

	function getter(rawPath: string) {
		for (const [dir, head] of Object.entries(dirs)) {
			if (rawPath.startsWith(head)) {
				const tail = rawPath.slice(head.length + 1).split(pathSep)
				return [dir, ...tail].map(encodeURI).join(keySep)
			}
		}
		return undefined
	}

	return focus<string>()(prism({ getter, setter }))
}
