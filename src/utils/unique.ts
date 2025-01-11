import assert from 'node:assert'

export function uniqueFactory<T>() {
	const used = new Set<unknown>()
	return function unique(value: T) {
		assert(!used.has(value))
		used.add(value)
		return value
	}
}
