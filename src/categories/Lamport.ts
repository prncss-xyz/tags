import { categoryWithDefault } from '../category'
import { Branded, registerBrand } from '../utils/brand'

registerBrand('Lamport')
export type TLamport = Branded<number, 'Lamport'>

export const Lamport = categoryWithDefault('Lamport')<TLamport, 'singleton'>(() => 0 as TLamport, {
	merge: (next, last) => Math.max(next, last) as TLamport,
})

export type ILamport = { lamport: TLamport }

function inc(x: TLamport) {
	return (x + 1) as TLamport
}

export function initLamport<T>(v: T): ILamport & T {
	return { ...v, lamport: 0 as TLamport }
}

export async function incLamport<T>(v: ILamport & T) {
	const lamport = await Lamport.map('singleton', inc)
	return { ...v, lamport }
}

export function lamportMerge<T>(next: ILamport & T, last: ILamport & T) {
	if (next.lamport > last.lamport) return next
	return last
}
