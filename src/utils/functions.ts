import { isFunction } from '@constellar/core'

export function opt<A, B>(cb: (a: A) => B | undefined) {
	return function (a: A | undefined): B | undefined {
		return a === undefined ? undefined : cb(a)
	}
}

export function flat<A, B>(cb: (a: A) => B[]) {
	return function (a: A[]): B[] {
		return a.flatMap(cb)
	}
}

export function promisedAll<A, B>(cb: (a: A) => Promise<B[]>) {
	return async function (asp: Promise<A[]>): Promise<B[]> {
		const as = await asp
		const bs = await Promise.all(as.map(cb))
		return bs.flat()
	}
}

export function promised<A, B>(cb: (a: A) => B | Promise<B>) {
	return function (a: Promise<A>): Promise<B> {
		return a.then(cb)
	}
}

export function asyncUpdater<Value>(
	up: ((last: undefined | Value) => Promise<undefined | Value>) | undefined | Value,
) {
	return async function (last: undefined | Value) {
		return isFunction(up) ? ((await up(last)) as undefined | Value) : up
	}
}
