import { id, pipe2 } from '@constellar/core'

export const opt = {
	chain<A, B>(cb: (a: A) => B | undefined) {
		return function (a: A | undefined) {
			if (a === undefined) return undefined
			return cb(a)
		}
	},
	map<A, B>(cb: (a: A) => B) {
		return function (a: A | undefined) {
			if (a === undefined) return undefined
			return cb(a)
		}
	},
	unit: id,
}

export const arr = {
	chain<A, B>(cb: (a: A) => B[]) {
		return function (a: A[]) {
			return a.flatMap(cb)
		}
	},
	map<A, B>(cb: (a: A) => B) {
		return function (a: A[]) {
			return a.map(cb)
		}
	},
	unit<A>(a: A) {
		return [a]
	},
}

export const pro = {
	chain<A, B>(cb: (a: A) => Promise<B>) {
		return function (a: Promise<A>) {
			return a.then(cb)
		}
	},
	map<A, B>(cb: (a: A) => B) {
		return function (ap: Promise<A>) {
			return ap.then(cb)
		}
	},
	unit<A>(a: A) {
		return Promise.resolve(a)
	},
}

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
	unit: pipe2(pro.unit, arr.unit),
}
