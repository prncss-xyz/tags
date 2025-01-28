import { describe, expect, it } from 'vitest'

import { zipCmp } from './zipCmp'

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
		for await (const x of xs) {
			yield x
		}
	}
}

function cmp(a: number, b: number) {
	if (a < b) return -1
	if (a > b) return 1
	return 0
}

// seams to work in runtime, need to find a way to test async iterators
describe.skip('zipCmp', () => {
	it('smaller', () => {
		const [res, cb] = spy<number | undefined>()
		zipCmp(fromArray([1, 2, 3])(), fromArray([1, 2, 4])(), cmp, cb)
		expect(res).toEqual([
			[1, 1],
			[2, 2],
			[3, undefined],
			[undefined, 4],
		])
	})
	it('greater', () => {
		const [res, cb] = spy<number | undefined>()
		zipCmp(fromArray([1, 2, 4])(), fromArray([1, 2, 3])(), cmp, cb)
		expect(res).toEqual([
			[1, 1],
			[2, 2],
			[undefined, 3],
			[4, undefined],
		])
	})
	it('shorter', () => {
		const [res, cb] = spy<number | undefined>()
		zipCmp(fromArray([1, 2])(), fromArray([1, 2, 3])(), cmp, cb)
		expect(res).toEqual([
			[1, 1],
			[2, 2],
			[undefined, 3],
		])
	})
	it('longer', () => {
		const [res, cb] = spy<number | undefined>()
		zipCmp(fromArray([1, 2, 3])(), fromArray([1, 2])(), cmp, cb)
		expect(res).toEqual([
			[1, 1],
			[2, 2],
			[3, undefined],
		])
	})
})
