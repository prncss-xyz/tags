import { isFunction } from '@constellar/core'

export function opt<A, B>(cb: (a: A) => B | undefined) {
	return function (a: A | undefined): B | undefined {
		return a === undefined ? undefined : cb(a)
	}
}

export function asyncUpdater<Value>(
	up: ((last: undefined | Value) => Promise<undefined | Value>) | undefined | Value,
) {
	return async function (last: undefined | Value) {
		return isFunction(up) ? ((await up(last)) as undefined | Value) : up
	}
}
