import { describe, expect, it } from 'vitest'

import { dedupeSorted } from './arrays'

describe('dedupeSorted', () => {
	it('should dedupe sorted iterable', () => {
		expect(dedupeSorted([])).toEqual([])
		expect(dedupeSorted([1])).toEqual([1])
		expect(dedupeSorted([1, 2])).toEqual([1, 2])
		expect(dedupeSorted([1, 2, 1])).toEqual([1, 2, 1])
		expect(dedupeSorted([1, 1, 2, 3, 4, 4, 5, 6, 6])).toEqual([1, 2, 3, 4, 5, 6])
	})
})
