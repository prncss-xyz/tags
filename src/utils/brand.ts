import { isoAssert } from './isoAssert'

const brand = Symbol('brand')
export type Branded<T, Brand extends string> = T & { readonly [brand]: Brand }
const brands = new Set<string>()

class Brander<T, Brand extends string> {
	constructor(
		brand: Brand,
		private cond: (t: T) => unknown,
	) {
		isoAssert(!brands.has(brand), `brand ${brand} has already been declared`)
		brands.add(brand)
	}
	asBrand(t: T) {
		isoAssert(this.cond(t))
		return t as Branded<T, Brand>
	}
	isBrand(t: T): t is Branded<T, Brand> {
		return Boolean(this.cond(t))
	}
}

export function registerBrand(brand: string) {
	isoAssert(!brands.has(brand), `brand ${brand} has already been declared`)
	brands.add(brand)
}

export type InferBrand<AnyBrander> =
	AnyBrander extends Brander<infer T, infer Brand> ? Branded<T, Brand> : never

export function branderWithValidate<T, Brand extends string>(
	brand: Brand,
	cond: (t: T) => unknown = () => true,
) {
	return new Brander<T, Brand>(brand, cond)
}
