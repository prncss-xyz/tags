/* eslint-disable @typescript-eslint/no-explicit-any */
import { isFunction } from '@constellar/core'

export type Init<Res, Args extends any[] = []> = ((...args: Args) => Res) | Res

export function fromInit<Res, Args extends any[] = []>(
	init: Init<Res, Args>,
	...args: Args
): Res {
	return isFunction(init) ? init(...args) : init
}
