/* eslint-disable @typescript-eslint/no-explicit-any */
import { focus, Focus, isUndefined, PRISM, REMOVE } from '@constellar/core'
import assert from 'node:assert'

import { insertValue, removeValue, symmetricDiff } from '../utils/arrays'
import { fromInit, Init } from '../utils/from-init'

export type UpdateEvent<Key, Value> = {
	key: Key
	last: undefined | Value
	next: undefined | Value
}

function always() {
	return true as const
}

export interface IFamily<Key, Value, R> {
	subscribe: (callback: (event: UpdateEvent<Key, Value>) => void) => void
	update: (key: Key, modify: (t: Value) => Value) => R
}

export interface IFamilyPutRemove<Key, Value, R> extends IFamily<Key, Value, R> {
	put: (key: Key, value: Value) => R
	remove: (key: Key) => R
}

type NonRemove<T> = T extends typeof REMOVE ? never : T

export function oneToOne<SValue, TValue, SKey, TKey, Fail, Command, R, Cond = true>(
	source: IFamily<SKey, SValue, R>,
	getTargetId: Init<TKey, [SValue]>,
	target: IFamily<TKey, TValue, R>,
	o: Focus<SKey, TValue, Fail, NonRemove<Command>, PRISM>,
	cond?: (s: SValue) => Cond,
): readonly [
	(source: SValue) => (Cond extends true ? never : undefined) | TKey,
	(t: TValue) => Fail | SKey,
]

export function oneToOne<SValue, TValue, SKey, TKey, Fail, IS_PRISM, R, Cond = true>(
	source: IFamily<SKey, SValue, R>,
	getTargetId: Init<TKey, [SValue]>,
	target: IFamilyPutRemove<TKey, TValue, R>,
	o: Focus<SKey, TValue, Fail, typeof REMOVE, IS_PRISM>,
	cond?: (s: SValue) => Cond,
): readonly [
	(source: SValue) => (Cond extends true ? never : undefined) | TKey,
	(t: TValue) => Fail | SKey,
]
export function oneToOne<SValue, TValue, SKey, TKey, Fail, IS_PRISM, Command, R, Cond = true>(
	source: IFamily<SKey, SValue, R>,
	getTargetId: Init<TKey, [SValue]>,
	target: IFamily<TKey, TValue, R> | IFamilyPutRemove<TKey, TValue, R>,
	o: Focus<SKey, TValue, Fail, Command, IS_PRISM>,
	cond: (s: SValue) => Cond = always as any,
) {
	const resolved = focus<TValue>()(o)
	function getTargetIdResolved(source: SValue | undefined) {
		if (isUndefined(source) || !cond(source)) return undefined
		return fromInit(getTargetId, source)
	}
	const getSourceId: (t: TValue) => Fail | SKey = resolved.view.bind(resolved)
	source.subscribe((event) => {
		const { key, last, next } = event
		const parentOut = getTargetIdResolved(last)
		const parentIn = getTargetIdResolved(next)
		if (parentIn === parentOut) return
		if (parentOut !== undefined) {
			if (resolved.isCommand(REMOVE)) target.update(parentOut, resolved.update(REMOVE))
			else {
				assert('remove' in target)
				target.remove(parentOut)
			}
		}
		if (parentIn !== undefined) {
			if (resolved.isCommand(REMOVE)) target.update(parentIn, resolved.update(key))
			else {
				assert('remove' in target)
				target.put(parentIn, resolved.put(key, undefined as any)) // only for prisms
			}
		}
	})
	return [
		getTargetIdResolved as (source: SValue) => (Cond extends true ? never : undefined) | TKey,
		getSourceId,
	] as const
}

export function manyToMany<SValue, TValue, SKey, TKey, Fail, Command, IS_PRISM, R, Cond = true>(
	source: IFamily<SKey, SValue, R>,
	getTargetIds: Init<TKey[], [SValue]>,
	target: IFamily<TKey, TValue, R>,
	o: Focus<SKey[], TValue, Fail, Command, IS_PRISM>,
	cond: (s: SValue) => Cond = always as any,
) {
	const resolved = focus<TValue>()(o)
	function getTargetIdsResolved(source: SValue | undefined) {
		if (isUndefined(source) || !cond(source)) return []
		return fromInit(getTargetIds, source)
	}
	const getSourceIds: (t: TValue) => Fail | SKey[] = resolved.view.bind(resolved)
	source.subscribe((event) => {
		const { key, last, next } = event
		const [parentsOut, parentsIn] = symmetricDiff(
			getTargetIdsResolved(last),
			getTargetIdsResolved(next),
		)
		parentsOut.forEach((parentOut) => target.update(parentOut, resolved.update(removeValue(key))))
		parentsIn.forEach((parentIn) => target.update(parentIn, resolved.update(insertValue(key))))
	})
	return [getTargetIdsResolved, getSourceIds] as const
}

export function oneToMany<SValue, TValue, SKey, TKey, Fail, Command, IS_PRISM, R, Cond = true>(
	source: IFamily<SKey, SValue, R>,
	getTargetId: Init<TKey, [SValue]>,
	target: IFamily<TKey, TValue, R>,
	o: Focus<SKey[], TValue, Fail, Command, IS_PRISM>,
	cond: (s: SValue) => Cond = always as any,
) {
	const resolved = focus<TValue>()(o)
	function getTargetIdResolved(source: SValue | undefined) {
		if (isUndefined(source) || !cond(source)) return undefined
		return fromInit(getTargetId, source)
	}
	const getSourceIds: (t: TValue) => Fail | SKey[] = resolved.view.bind(resolved)
	source.subscribe((event) => {
		const { key, last, next } = event
		const parentOut = getTargetIdResolved(last)
		const parentIn = getTargetIdResolved(next)
		if (parentIn === parentOut) return
		if (parentOut !== undefined) target.update(parentOut, resolved.update(removeValue(key)))
		if (parentIn !== undefined) target.update(parentIn, resolved.update(insertValue(key)))
	})
	return [
		getTargetIdResolved as (source: SValue) => (Cond extends true ? never : undefined) | TKey,
		getSourceIds,
	] as const
}
