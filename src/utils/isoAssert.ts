export function isoAssert(condition: unknown, message?: string): asserts condition {
	if (condition === false) throw new Error(message ?? 'assertion failed')
}

export function assertDefined<X>(message?: string) {
	return function (x: undefined | X): X {
		isoAssert(x !== undefined, message)
		return x
	}
}
