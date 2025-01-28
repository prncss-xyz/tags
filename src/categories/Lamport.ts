import { brand } from '@prncss-xyz/utils'

import { categoryWithDefault } from '../category'

const lamport = brand('Lamport')
export type TLamport = number & ReturnType<typeof lamport>

export const Lamport = categoryWithDefault('Lamport')<TLamport, 'singleton'>(() => 0 as TLamport, {
	merge: (next, last) => lamport(Math.max(next, last)),
})

export type ILamport = { lamport: TLamport }

function inc(x: TLamport) {
	return lamport(x + 1)
}

export function initLamport<T>(v: T): ILamport & T {
	return { ...v, lamport: lamport(0) }
}

export async function incLamport<T>(v: ILamport & T) {
	const lamport = await Lamport.map('singleton', inc)
	return { ...v, lamport }
}

export function lamportMerge<T>(next: ILamport & T, last: ILamport & T) {
	if (next.lamport > last.lamport) return next
	return last
}
