function isFail<X>(x: null | undefined | X): x is null | undefined {
	return x === undefined || x === null
}

// TODO: make it work with async generators
export async function zipCmp<X, Y>(
	xs: AsyncIterable<X>,
	ys: AsyncIterable<Y>,
	cmp: (x: X, y: Y) => number,
	cb: (x: undefined | X, y: undefined | Y) => void,
) {
	const xi = xs[Symbol.asyncIterator]()
	const yi = ys[Symbol.asyncIterator]()
	let x: undefined | X = (await xi.next()).value
	let y: undefined | Y = (await yi.next()).value
	while (true) {
		if (isFail(x)) {
			while (!isFail(y)) {
				cb(x, y)
				y = (await yi.next()).value
			}
			return
		}
		if (isFail(y)) {
			while (!isFail(x)) {
				cb(x, y)
				x = (await xi.next()).value
			}
			return
		}
		if (cmp(x, y) < 0) {
			cb(x, undefined)
			x = (await xi.next()).value
			continue
		}
		if (cmp(x, y) > 0) {
			cb(undefined, y)
			y = (await yi.next()).value
			continue
		}
		cb(x, y)
		x = (await xi.next()).value
		y = (await yi.next()).value
	}
}
