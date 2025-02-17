import { describe, expect, test } from 'vitest'

import { shouldAnalyze } from '.'
describe('shouldAnalyze', () => {
	test('should return true for .txt files', () => {
		expect(shouldAnalyze('foo.txt')).toBe(true)
	})
	test('should return true for .md files', () => {
		expect(shouldAnalyze('foo.toto.md')).toBe(true)
	})
	test('should return false for other files', () => {
		expect(shouldAnalyze('foo.js')).toBe(false)
	})
})
