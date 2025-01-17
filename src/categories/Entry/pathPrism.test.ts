import { describe, expect, it } from 'vitest'

import { Entries } from '.'
import { CategoryKey } from '../../category'
import { getPathPrism } from './pathPrism'

describe('pathLens', () => {
	const dirs = {
		home: '/home/toto',
	}
	const pathPrism = getPathPrism(dirs)
	it('should convert back and forth', () => {
		expect(pathPrism.view('/home/toto/a/b c')).toBe('home a b%20c')
		expect(pathPrism.put('home a b%20c' as CategoryKey<typeof Entries>)).toBe('/home/toto/a/b c')
	})
})
