import { describe, expect, it } from 'vitest'

import { zipCmp } from './iterators'

function spy<X>() {
	const res: [X, X][] = []
	return [
		res,
		(x: X, y: X) => {
			res.push([x, y])
		},
	] as const
}

function fromArray<X>(xs: X[]) {
	return async function* () {
		for (const x of xs) {
			yield x
		}
	}
}

describe('zipCmp', () => {
	it('smaller', () => {
		const [res, cb] = spy<number | undefined>()
		zipCmp(fromArray([1, 2, 3])(), fromArray([1, 2, 4])(), cb)
		expect(res).toEqual([
			[1, 1],
			[2, 2],
			[3, undefined],
			[undefined, 4],
		])
	})
	it('greater', () => {
		const [res, cb] = spy<number | undefined>()
		zipCmp(fromArray([1, 2, 4])(), fromArray([1, 2, 3])(), cb)
		expect(res).toEqual([
			[1, 1],
			[2, 2],
			[undefined, 3],
			[4, undefined],
		])
	})
	it('shorter', () => {
		const [res, cb] = spy<number | undefined>()
		zipCmp(fromArray([1, 2])(), fromArray([1, 2, 3])(), cb)
		expect(res).toEqual([
			[1, 1],
			[2, 2],
			[undefined, 3],
		])
	})
	it('longer', () => {
		const [res, cb] = spy<number | undefined>()
		zipCmp(fromArray([1, 2, 3])(), fromArray([1, 2])(), cb)
		expect(res).toEqual([
			[1, 1],
			[2, 2],
			[3, undefined],
		])
	})
})
