export function dedupeSorted<X>(iter: Iterable<X>) {
	let first = true
	let last: X
	const res: X[] = []
	for (const next of iter) {
		if (first) {
			first = false
		} else {
			if (Object.is(next, last!)) continue
		}
		res.push(next)
		last = next
	}
	return res
}
