/* eslint-disable @typescript-eslint/no-explicit-any */
import { id, lens, pipe, Prettify } from '@constellar/core'
import { brand, collectIndexed, filter, map, objSink, sortedSink } from '@prncss-xyz/utils'

import { categoryWithDefault } from '../../category'
import { adjustPath } from './utils'

const toLamport_ = brand('Lamport')
export const toLamport = (v: number) => toLamport_(v)
export type TLamport = number & ReturnType<typeof toLamport>

export const Lamport = categoryWithDefault('Lamport')<TLamport, 'singleton'>(() => toLamport(0), {
	index: true,
})

// TODO: optimistic update
export function notifyUsedLamport(lamport: TLamport) {
	return Lamport.merge('singleton', toLamport(lamport + 1))
}

function mergeLamportValue<T>(
	prioritizeLocal: boolean,
	notifyMax: (v: TLamport) => void,
	local: LamportValue<T>,
	remote: unknown,
) {
	if (!isObject(remote)) return local
	if (!isLamportValue(remote)) return local
	if (local.lamport > remote.lamport) {
		return local
	}
	if (local.lamport === remote.lamport && prioritizeLocal) {
		return local
	}
	notifyMax(remote.lamport)
	return remote
}

function isLamportValue(v: object): v is LamportValue<unknown> {
	return 'lamport' in v && typeof v.lamport === 'number' && 'payload' in v
}
function isObject(v: unknown): v is object {
	return typeof v === 'object' && v !== null
}

export function mergeWithPath(
	prioritizeLocal: boolean,
	notifyMax: (v: TLamport) => void,
	local: unknown,
	steps: string[],
	value: LamportValue<unknown>,
) {
	return adjustPath(steps, (v) => mergeLamportValue(prioritizeLocal, notifyMax, v, value), local)
}

export async function updateLamport<T>(next: T) {
	return { ...next, lamport: toLamport(1 + (await Lamport.get('singleton'))) }
}

export type LamportValue<T> = { lamport: TLamport; payload: T }

export function initLamportValue<T>(payload: T, notify?: ((v: T) => void) | undefined) {
	if (notify) notify(payload)
	return { lamport: toLamport(0), payload }
}

export function lamportValueLens<T>(lamport: TLamport, notify: (v: unknown) => void) {
	return lens<T, { lamport: TLamport; payload: T }>({
		getter: (w) => w.payload,
		setter: (part, whole) => {
			if (whole.payload === part) return whole
			notify(part)
			return { lamport, payload: part }
		},
	})
}

export type LamportObject<O extends Record<string, unknown>> = Prettify<{
	[K in keyof O]: { lamport: TLamport; payload: O[K] }
}>

export function initLamportObj<O extends Record<string, unknown>>(
	value: O,
	notify?: ((k: keyof O, v: unknown) => void) | undefined,
): LamportObject<O> {
	return collectIndexed(
		Object.entries(value),
		map((v, index) => initLamportValue(v, notify ? (v: unknown) => notify(index, v) : undefined)),
	)(objSink()) as any
}

export function lamportObjLens<O extends Record<PropertyKey, unknown>>(
	lamport: TLamport,
	notify: (k: keyof O, v: O[keyof O]) => void,
) {
	return lens<O, LamportObject<O>>({
		getter: (w) => {
			const res: any = {}
			for (const [k, v] of Object.entries(w)) res[k] = v.payload
			return res
		},
		setter: (part, whole) => {
			let dirty = false
			const res: any = { ...whole }
			for (const [k, v] of Object.entries<any>(part)) {
				if (!(k in whole) || whole[k]!.payload !== v) {
					dirty = true
					notify(k, v)
					res[k] = { lamport, payload: v }
				}
			}
			if (dirty) notifyUsedLamport(lamport)
			return dirty ? res : whole
		},
	})
}

export function recordToSet<K extends string>() {
	return lens<K[], Record<K, boolean>>({
		getter: (w) =>
			collectIndexed(
				Object.entries(w),
				pipe(
					filter(id),
					map((_, k) => k as K),
				),
			)(sortedSink()),
		setter: (part, whole) => {
			const res: Record<string, boolean> = {}
			let dirty = false
			for (const [k, v] of Object.entries(whole)) {
				const r = part.includes(k as any)
				if (r !== v) {
					dirty = true
					res[k] = r
				}
			}
			for (const k of part) {
				if (!res[k]) {
					if (!whole[k]) dirty = true
					res[k] = true
				}
			}
			return dirty ? res : whole
		},
	})
}
