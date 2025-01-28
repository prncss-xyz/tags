import { isFunction } from '@constellar/core'

export function asyncUpdater<Value>(
	up: ((last: undefined | Value) => Promise<undefined | Value>) | undefined | Value,
) {
	return async function (last: undefined | Value) {
		return isFunction(up) ? ((await up(last)) as undefined | Value) : up
	}
}
