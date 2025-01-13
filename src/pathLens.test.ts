import { describe, expect, it } from 'vitest'

import { getPathPrism } from './pathLens'

describe('pathLens', () => {
  const dirs = {
    'home': '/home',
  }
  const pathPrism = getPathPrism(dirs)
	it('should convert back and forth', () => {
		expect(pathPrism.view('/home/a/b c')).toBe('home a b%20c')
		expect(pathPrism.put('home a b%20c')).toBe('/home/a/b c')
	})
})
