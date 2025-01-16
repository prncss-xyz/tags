import { isFunction, } from '@constellar/core'

export function opt<A, B>(cb: (a: A) => B | undefined) {
	return function (a: A | undefined): B | undefined {
		return a === undefined ? undefined : cb(a)
	}
}

export function promised<A, B>(cb: (a: A) => B | Promise<B>) {
	return function (a: A | Promise<A>): Promise<B> {
		return a instanceof Promise ? a.then(cb) : Promise.resolve(cb(a))
	}
}

export function promisedAll<A, B>(cb: (a: A) => Promise<B>[]) {
	return function (a: A | Promise<A>) {
		return promised((a: A) => Promise.all(cb(a)))(a)
	}
}

export function asyncUpdater<Value>(
	up: ((last: undefined | Value) => Promise<undefined | Value>) | undefined | Value,
) {
	return async function (last: undefined | Value) {
		return isFunction(up) ? ((await up(last)) as undefined | Value) : up
	}
}
