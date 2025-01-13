/* eslint-disable @typescript-eslint/no-explicit-any */
export function merge<T extends object>(a: T, b?: Partial<T>): T {
	if (!b) return a
	const res: any = { ...a }
	for (const [key, value] of Object.entries<any>(b)) {
		if (key in res) {
			if (Array.isArray(res[key]) && Array.isArray(value)) {
				res[key] = res[key].concat(value)
				continue
			}
			if (typeof res[key] === 'object' && typeof value === 'object') {
				res[key] = merge(res[key], value)
				continue
			}
		}
		res[key] = value
	}
	for (const [key, value] of Object.entries(a)) {
		if (!(key in b)) {
			res[key] = value
		}
	}
	return res
}
