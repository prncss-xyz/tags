import { flow, id, pipe } from '@constellar/core'
import { describe, expect, expectTypeOf, test } from 'vitest'

import {
	aBoolean,
	anArrayOf,
	anArrayWith,
	aNumber,
	aString,
	cond,
	each,
	lazy,
	literal,
	matcher,
	option,
	optional,
	otherwise,
	parseObject,
	Parser,
	result,
	some,
	useParser,
	validateObject,
} from './patterns'

describe('patterns', () => {
	test('literals', () => {
		function t(x: number) {
			return flow(
				matcher(x),
				literal(1, 2, 3)(() => true),
				cond(
					(x) => x === 1,
					() => true,
				),
				result(),
			)
		}
		expect(t(1)).toBe(true)
		expect(t(4)).toBeUndefined()
		expectTypeOf(t).returns.toEqualTypeOf<boolean | undefined>()
	})
	describe('guards', () => {
		test('exhaustive can return undefined', () => {
			function t(x: boolean | number | string) {
				return flow(
					matcher(x),
					aString(() => true),
					aNumber((x) => x + 1),
					result('none'),
				)
			}
			expect(t('a')).toBe(true)
			expect(t(1)).toBe(2)
			expect(t(true)).toEqual('none')
			expectTypeOf(t).returns.toEqualTypeOf<'none' | boolean | number>()
		})
		test('exhaustive should never return undefined', () => {
			function t(x: boolean | number | string) {
				return flow(
					matcher(x),
					cond(
						(x) => typeof x === 'string',
						(_x) => true,
					),
					aBoolean((x) => !x),
					aNumber((x) => x + 1),
					result(),
				)
			}
			expect(t('a')).toBe(true)
			expect(t(1)).toBe(2)
			expect(t(true)).toBe(false)
			expectTypeOf(t).returns.toEqualTypeOf<boolean | number>()
		})
	})
	describe('match', () => {
		test('otherwise', () => {
			function t(x: number) {
				return flow(
					matcher(x),
					cond(
						(x) => x < 0,
						(x) => -x,
					),
					otherwise(id),
					result(),
				)
			}
			expect(t(-1)).toBe(1)
			expect(t(1)).toBe(1)
			expectTypeOf(t).returns.toEqualTypeOf<number>()
		})
	})
	describe('validation', () => {
		test('from unknown', () => {
			function t(x: unknown) {
				return flow(matcher(x), aNumber(), aString(), result())
			}
			expect(t(1)).toBe(1)
			expect(t(true)).toBeUndefined()
			expectTypeOf(t).returns.toEqualTypeOf<number | string | undefined>()
		})
	})
	describe('arrays', () => {
		test('anArrayWith', () => {
			function t(x: unknown) {
				return flow(matcher(x), anArrayWith(aNumber()), result())
			}
			expect(t(['a', 1])).toBe(1)
			expect(t(['a'])).toBeUndefined()
			expectTypeOf(t).returns.toEqualTypeOf<number | undefined>()
		})
		test('some', () => {
			function t(x: number[]) {
				return flow(matcher(x), some(cond((x) => x > 0)), result())
			}
			expect(t([-1, 1])).toBe(1)
			expect(t([-1])).toBeUndefined()
			expectTypeOf(t).returns.toEqualTypeOf<number | undefined>()
		})
		test('anArrayOf', () => {
			function t(x: unknown) {
				return flow(matcher(x), anArrayOf(aNumber()), result())
			}
			expect(t(['a', 1])).toBeUndefined()
			expect(t([1, 2])).toEqual([1, 2])
			expectTypeOf(t).returns.toEqualTypeOf<number | undefined>()
		})
		test('each', () => {
			function t(x: number[]) {
				return flow(matcher(x), each(cond((x) => x > 0)), result())
			}
			expect(t([-1, 1])).toBeUndefined()
			expect(t([1, 2])).toEqual([1, 2])
			expectTypeOf(t).returns.toEqualTypeOf<number | undefined>()
		})
	})
	// TODO: make fields optional
	describe('obj', () => {
		test('from unknown', () => {
			function t(u: unknown) {
				return flow(
					matcher(u),
					validateObject({
						a: pipe(optional(), aNumber()),
						b: id(aString((x) => x.length)),
					}),
					result(),
				)
			}
			expect(t({ a: 1, b: 'b', c: 1 })).toEqual({ a: 1, b: 1 })
			expect(t({ a: 1 })).toBeUndefined()
			expect(t({ a: 1, b: 1 })).toBeUndefined()
			expectTypeOf(t).returns.toEqualTypeOf<
				| undefined
				| {
						a?: number | undefined
						b: number
				  }
			>()
		})
		test('from typed', () => {
			type T = {
				a: number | undefined
				b: string
			}
			function t(u: T) {
				return flow(
					matcher(u),
					parseObject({
						a: option(cond(() => true)),
						b: option(
							cond(() => true),
							false,
						),
					}),
					result(),
				)
			}
			// FIXME: should not fail
			expect(t({ a: 1, b: 'b' })).toEqual({ a: 1, b: 'b' })
			expectTypeOf(t).returns.toEqualTypeOf<
				| undefined
				| {
						a?: number | undefined
						b: false | string
				  }
			>()
		})
	})
	test('recursive', () => {
		type Tree = {
			left?: Tree
			node: string
			right?: Tree
		}
		const p: Parser<unknown, Tree> = validateObject({
			left: option(lazy((m) => p(m))),
			node: aString(),
			right: option(lazy((m) => p(m))),
		})
    const t = useParser(p)
		expect(t({ left: { left: { node: 'c' }, node: 'b' }, node: 'a' })).toEqual({
			left: {
				left: {
					node: 'c',
				},
				node: 'b',
			},
			node: 'a',
		})
		expect(t({ left: { left: { node: 3 }, node: 'b' }, node: 'a' })).toBeUndefined()
	})
})
