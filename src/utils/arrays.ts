export function dedupeSorted<X>(iter: Iterable<X>) {
	const xs = Array.from(iter).sort()
	let first = true
	let last: X
	const res: X[] = []
	for (const next of xs) {
		if (!first && Object.is(last!, next)) continue
		res.push(next)
		last = next
		first = false
	}
	return res
}
