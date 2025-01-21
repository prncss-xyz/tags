/* eslint-disable @typescript-eslint/no-explicit-any */
import { id, Prettify } from '@constellar/core'

import { fromInit, Init } from './fromInit'

class Matcher<T> {
	constructor(public value: T) {}
}

class Success<T> {
	constructor(public value: T) {}
}

export type Parser<S, T> = (m: Matcher<S> | Success<never>) => Matcher<unknown> | Success<T>
export type ExhaustiveParser<S, T> = (m: Matcher<S> | Success<never>) => Matcher<never> | Success<T>
export function useParser<S, T, M>(p: (m: Matcher<S> | Success<never>) => Matcher<M> | Success<T>) {
	return function (u: S) {
		return result()(p(matcher(u)))
	}
}

export function matcher<T>(v: T): Matcher<T> | Success<never> {
	return new Matcher(v)
}

export function transform<A, T, U>(cb: (t: T) => U) {
	return function (v: Matcher<A> | Success<T>) {
		if (v instanceof Success) new Success<U>(cb(v.value))
		return v
	}
}

export function result<const Fallback = undefined>(or?: Init<Fallback>) {
	return function <A, T>(v: Matcher<A> | Success<T>) {
		if (v instanceof Success) return v.value
		return fromInit(or) as A extends unknown ? Fallback : never
	}
}

export function exhaustive() {
	return function <T>(v: Success<T>) {
		return v
	}
}

export function otherwise<A, T>(cb: (a: A) => T) {
	return function <U>(a: Matcher<A> | Success<U>) {
		if (a instanceof Success) return a
		return new Success<T | U>(cb(a.value)) as Matcher<never> | Success<T | U>
	}
}

// this is necessary for with want to be able to both:
// i) use a generic (u: unknown) => u is B
// ii) use a specific (u: A) => u is B and still get type inference and narrowing
export function cond<A, B extends A & C, C extends A, T = B>(
	test: (a: C) => a is B,
	cb?: (a: B) => T,
): <S>(a: Matcher<A> | Success<S>) => Matcher<Exclude<A, B>> | Success<S | T>
export function cond<A, T = A>(
	test: (a: A) => unknown,
	cb?: (a: A) => T,
): <S>(a: Matcher<A> | Success<S>) => Matcher<A> | Success<S | T>
export function cond<A extends K, K, T = A>(test: (a: K) => unknown, cb: (a: A) => T = id as any) {
	return function <U>(a: Matcher<A> | Success<U>): Matcher<A> | Success<T | U> {
		if (a instanceof Success) return a
		if (test(a.value)) return new Success<T | U>(cb(a.value))
		return a
	}
}

export function optional<const T = undefined>(or?: Init<T>) {
	return function <M, S>(a: Matcher<M> | Success<S>) {
		if (a instanceof Success) return a
		if (a.value === undefined) return new Success<T>(fromInit<any>(or))
		return a as Matcher<Exclude<M, undefined>> | Success<S | T>
	}
}

export function option<M, S, T, U, const I = undefined>(
	m: (u: Matcher<M> | Success<S>) => Matcher<T> | Success<U>,
	or?: Init<unknown extends I ? undefined : I>,
) {
	return function (a: Matcher<M> | Success<S>) {
		return optional(or)(m(a))
	}
}

export function guard<C>(test: (a: unknown) => a is C) {
	return function <A, T = A & C>(cb: (a: A & C) => T = id as any) {
		return function <U>(a: Matcher<A> | Success<U>) {
			if (a instanceof Success) return a
			if (test(a.value)) return new Success<T | U>(cb(a.value))
			return a as Matcher<Exclude<A, C>> | Success<T | U>
		}
	}
}

export function isString(u: unknown): u is string {
	return typeof u === 'string'
}
export function isNumber(u: unknown): u is number {
	return typeof u === 'number'
}
export function isBoolean(u: unknown): u is boolean {
	return typeof u === 'boolean'
}
export function isLiteral<const LS extends unknown[]>(...ls: LS) {
	return function <T>(u: T): u is LS[number] & T {
		return ls.some((l) => l === u)
	}
}

export const aNumber = guard(isNumber)
export const aString = guard(isString)
export const aBoolean = guard(isBoolean)
export function literal<const LS extends unknown[]>(...ls: LS) {
	return guard(isLiteral(...ls))
}

export function anArrayWith<S, T = S>(
	m: (m: Matcher<unknown> | Success<never>) => Matcher<unknown> | Success<S>,
	cb?: (a: S) => T,
): <U>(a: Matcher<unknown> | Success<U>) => Matcher<unknown> | Success<T | U>
export function anArrayWith<S, T = S>(
	m: (m: Matcher<unknown> | Success<never>) => Matcher<unknown> | Success<S>,
	cb: (a: S) => T = id as any,
) {
	return function <U>(as: Matcher<unknown> | Success<U>) {
		if (as instanceof Success) return as
		if (!Array.isArray(as.value)) return as
		for (const a of as.value) {
			const res = m(matcher(a))
			if (res instanceof Success) return new Success<T | U>(cb(res.value))
		}
		return as
	}
}

export function some<A, S, T = S>(
	m: (m: Matcher<A> | Success<never>) => Matcher<unknown> | Success<S>,
	cb: (a: S) => T = id as any,
): <U>(as: Matcher<A[]> | Success<U>) => Matcher<A[]> | Success<T | U> {
	return function <U>(as: Matcher<A[]> | Success<U>) {
		if (as instanceof Success) return as
		for (const a of as.value) {
			const res = m(matcher(a))
			if (res instanceof Success) return new Success<T | U>(cb(res.value))
		}
		return as
	}
}

export function anArrayOf<S, T = S>(
	m: (m: Matcher<unknown> | Success<never>) => Matcher<unknown> | Success<S>,
	cb: (a: S[]) => T = id as any,
): <U>(as: Matcher<unknown> | Success<U>) => Matcher<unknown> | Success<T | U> {
	return function <U>(as: Matcher<unknown> | Success<U>) {
		if (as instanceof Success) return as
		if (!Array.isArray(as.value)) return as
		const res: S[] = []
		for (const a of as.value) {
			const r = m(matcher(a))
			if (r instanceof Success) res.push(r.value)
			else return as
		}
		return new Success<T | U>(cb(res))
	}
}

export function each<A, S, T = S>(
	m: (m: Matcher<A> | Success<never>) => Matcher<unknown> | Success<S>,
	cb: (a: S[]) => T = id as any,
): <U>(as: Matcher<A[]> | Success<U>) => Matcher<A[]> | Success<T | U> {
	return function <U>(as: Matcher<A[]> | Success<U>) {
		if (as instanceof Success) return as
		const res: S[] = []
		for (const a of as.value) {
			const r = m(matcher(a))
			if (r instanceof Success) res.push(r.value)
			else return as
		}
		return new Success<T | U>(cb(res))
	}
}

type AnyOValidator = Record<
	PropertyKey,
	(u: Matcher<unknown> | Success<never>) => Matcher<unknown> | Success<unknown>
>

type InferValidatorSuccess<M extends AnyOValidator> = Prettify<
	WithOptionals<{
		[K in keyof M]: M[K] extends (u: any) => Matcher<unknown> | Success<infer T> ? T : never
	}>
>

export function validateObject<M extends AnyOValidator>(m: M, passthrough = false) {
	return function (u: Matcher<unknown>) {
		const uValue = u.value
		if (uValue === null || typeof uValue !== 'object') return u
		const res: any = {}
		for (const [k, v] of Object.entries(m)) {
			const r = v(matcher((uValue as any)[k]))
			if (r instanceof Success) {
				res[k] = r.value
				continue
			}
			return u
		}
		if (passthrough)
			for (const [k, v] of Object.entries(uValue)) {
				if (k in m) continue
				res[k] = v
			}
		return new Success<InferValidatorSuccess<M>>(res)
	}
}

type AnyOParser<M extends object> = Partial<{
	[K in keyof M]: (u: Matcher<M[K]> | Success<never>) => Matcher<unknown> | Success<unknown>
}>
type InferParserSuccess<M extends object, P extends AnyOParser<M>> = {
	[K in keyof P]: P[K] extends (u: any) => Matcher<any> | Success<infer T> ? T : never
}
type AddDefaults<M extends object, P extends object> = {
	[K in keyof M]: K extends keyof P ? P[K] : M[K]
}
type DefinedKeys<O extends object> = Exclude<
	{ [K in keyof O]: undefined extends O[K] ? never : K }[keyof O],
	undefined
>
type WithOptionals<O extends object> = Partial<O> & {
	[K in DefinedKeys<O>]: O[K]
}
type InferResult<M extends object, P extends AnyOParser<M>> = Prettify<
	WithOptionals<AddDefaults<M, InferParserSuccess<M, P>>>
>

export function parseObject<M extends object, Parser extends AnyOParser<M>>(p: Parser) {
	return function <S>(u: Matcher<M> | Success<S>) {
		if (u instanceof Success) return u
		const uValue = u.value
		const res: any = {}
		for (const [k, v] of Object.entries<any>(p)) {
			const r = v(matcher((uValue as any)[k]))
			if (r instanceof Success) {
				res[k] = r.value
				continue
			}
			return u as Matcher<M>
		}
		for (const [k, v] of Object.entries(uValue)) {
			if (k in p) continue
			res[k] = v
		}
		return new Success<InferResult<M, Parser> | S>(res)
	}
}

export function lazy<Args extends unknown[], R>(cb: (...args: Args) => R) {
	return (...args: Args) => {
		return cb(...args)
	}
}
