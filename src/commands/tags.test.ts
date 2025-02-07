import { filtered, included, negate } from '@prncss-xyz/utils'
import { describe, expect, test } from 'vitest'

describe('remove', () => {
	test('', () => {
		const xs = [1, 2, 3, 4]
		const f = filtered(negate(included([2, 3])))
		expect(f(xs)).toEqual([1, 4])
	})
})
