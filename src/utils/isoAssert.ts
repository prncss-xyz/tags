export function isoAssert(condition: unknown, message?: string): asserts condition {
	if (condition === false) throw new Error(message ?? 'assertion failed')
}
