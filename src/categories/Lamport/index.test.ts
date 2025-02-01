import { focus } from '@constellar/core'
import { describe, expect, expectTypeOf, test } from 'vitest'

import { initLamportObj, lamportObjLens, recordToSet, TLamport, toLamport } from '../Lamport'

describe('initObjLamport', () => {
	const t = { a: 1, b: 2 }
	test('', () => {
		const l = initLamportObj(t)
		expect(l).toEqual({
			a: { lamport: 0, payload: 1 },
			b: { lamport: 0, payload: 2 },
		})
		expectTypeOf(l).toMatchTypeOf<Record<'a' | 'b', { lamport: TLamport; payload: number }>>()
	})
})

describe('lamportObjLens', () => {
	test('getter', () => {
		const t = { a: 1, b: 2 }
		const l = initLamportObj(t)
		const ups: [string, unknown][] = []
		function notify(k: string, v: unknown) {
			ups.push([k, v])
		}
		const f = focus<typeof l>()(lamportObjLens(toLamport(0), notify))
		expect(f.view(l)).toEqual(t)
	})
	test('setter, upload lamport only on change values', () => {
		const t = { a: 1, b: 2 }
		const l = initLamportObj(t)
		const ups: [string, unknown][] = []
		function notify(k: string, v: unknown) {
			ups.push([k, v])
		}
		const f = focus<typeof l>()(lamportObjLens(1 as TLamport, notify))
		expect(f.put({ a: 2, b: 2 }, l)).toEqual({
			a: { lamport: 1, payload: 2 },
			b: { lamport: 0, payload: 2 },
		})
		expect(ups).toEqual([['a', 2]])
	})
	test('setter, preserve reference', () => {
		const t = { a: 1, b: 2 }
		const l = initLamportObj(t)
		const ups: [string, unknown][] = []
		function notify(k: string, v: unknown) {
			ups.push([k, v])
		}
		const f = focus<typeof l>()(lamportObjLens(1 as TLamport, notify))
		expect(f.put({ a: 1, b: 2 }, l)).toBe(l)
		expect(ups).toEqual([])
	})
})

describe('objToSet', () => {
	const f = focus<Record<string, boolean>>()(recordToSet())
	describe('getter', () => {
		test('empty', () => {
			expect(f.view({})).toEqual([])
		})
		test('simple', () => {
			expect(f.view({ a: true, b: false })).toEqual(['a'])
		})
		test('elements of the set appears in order', () => {
			// eslint-disable-next-line perfectionist/sort-objects
			expect(f.view({ b: true, a: true })).toEqual(['a', 'b'])
		})
	})
	describe('setter', () => {
		test('keys become false after deletion (instead of disappearing)', () => {
			expect(f.put(['b', 'c', 'd'], { a: true, b: true, c: false })).toEqual({
				a: false,
				b: true,
				c: true,
				d: true,
			})
		})
		test('preserve reference', () => {
			const t = { b: true, c: true, d: true }
			expect(f.put(['b', 'c', 'd'], t)).toBe(t)
		})
	})
})
