import { id } from '@constellar/core'
import { describe, expect, test } from 'vitest'

import { adjustPath } from './utils'

describe('adjustPath', () => {
	test('simple', () => {
		expect(adjustPath(['a'], (v) => v + 1, { a: 1, b: 2, c: 3 })).toEqual({
			a: 2,
			b: 2,
			c: 3,
		})
	})
	test('nested', () => {
		expect(adjustPath(['a', 'b'], (v) => v + 1, { a: { b: 1 } })).toEqual({
			a: { b: 2 },
		})
	})
	test('nested', () => {
		expect(adjustPath(['a', 'b', 'c'], (v) => v + 1, { a: { b: { c: 3 } } })).toEqual({
			a: { b: { c: 4 } },
		})
	})
	test('preserve reference, nested', () => {
		const v = { a: { b: { c: 3 } } }
		expect(adjustPath(['a', 'b', 'c'], id, v)).toBe(v)
	})
})
