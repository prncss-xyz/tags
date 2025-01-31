/* eslint-disable @typescript-eslint/no-explicit-any */

import { isoAssert } from '@prncss-xyz/utils'

function adjust(k: string, f: (v: any) => any, o: any) {
	const last = o[k]
	const next = f(last)
	if (Object.is(next, last)) return o
	return { ...o, [k]: next }
}

export function adjustPath(path: string[], f: (v: any) => any, o: unknown) {
	if (path.length === 0) {
		const next = f(o)
		if (Object.is(next, o)) return o
		return next
	}
	isoAssert(path.length > 0)
	return adjust(
		path[0]!,
		path.length === 1 ? f : (v) => adjustPath(path.slice(1), f, v),
		o,
	) as unknown
}
