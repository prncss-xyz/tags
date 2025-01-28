import { brand, fromInit, Init } from '@prncss-xyz/utils'

import { categoryWithDefault } from '../category'

const lamport = brand('Lamport')
export type TLamport = number & ReturnType<typeof lamport>

export const Lamport = categoryWithDefault('Lamport')<TLamport, 'singleton'>(() => 0 as TLamport, {
	index: true,
	merge: (next, last) => Promise.resolve(lamport(Math.max(next, last))),
})

export type ILamport = { lamport: TLamport }

export function initLamport<T>(v: T): ILamport & T {
	return { ...v, lamport: lamport(0) }
}

export async function mergeLamport<T>(next: ILamport & T, last: ILamport & T) {
	if (next.lamport > last.lamport) {
		await Lamport.merge('singleton', next.lamport)
		return next
	}
	return last
}

export async function updateLamport<T>(next: T) {
	return { ...next, lamport: lamport(1 + (await Lamport.get('singleton'))) }
}
