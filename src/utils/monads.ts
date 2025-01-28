export const pros = {
	chain<A, B>(cb: (a: A) => Promise<B[]>) {
		return function (asp: Promise<A[]>): Promise<B[]> {
			return asp.then((as) => Promise.all(as.map(cb))).then((bs) => bs.flat())
		}
	},
	map<A, B>(cb: (a: A) => B) {
		return function (asp: Promise<A[]>) {
			return asp.then((as) => as.map(cb))
		}
	},
	unit<A>(a: A) {
		return Promise.resolve([a])
	},
}
