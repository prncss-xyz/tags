/* eslint-disable @typescript-eslint/no-explicit-any */
import { focus, Focus, isUndefined, PRISM, REMOVE } from '@constellar/core'

import { insertValue, removeValue, symmetricDiff } from '../utils/arrays'
import { fromInit, Init } from '../utils/fromInit'
import { isoAssert } from '../utils/isoAssert'

export type UpdateEvent<Key, Value> = {
	key: Key
	last: undefined | Value
	next: undefined | Value
}

export interface IFamily<Key, Value> {
	get: (key: Key) => Promise<undefined | Value>
	map: (key: Key, modify: (t: Value) => Value) => Promise<void>
	subscribe: (callback: (event: UpdateEvent<Key, Value>) => void) => void
}

export interface IFamilyPutRemove<Key, Value> extends IFamily<Key, Value> {
	put: (key: Key, value: Value) => Promise<void>
	remove: (key: Key) => Promise<void>
}

export type NonRemove<T> = T extends typeof REMOVE ? never : T

export function oneToOne<SValue, TValue, SKey, TKey, Fail, Command>(
	source: IFamily<SKey, SValue>,
	getTargetId: Init<TKey | undefined, [SValue]>,
	target: IFamily<TKey, TValue>,
	o: Focus<SKey, TValue, Fail, NonRemove<Command>, PRISM>,
): (t: TValue) => Fail | SKey
export function oneToOne<SValue, TValue, SKey, TKey, Fail, IS_PRISM>(
	source: IFamily<SKey, SValue>,
	getTargetId: Init<TKey | undefined, [SValue]>,
	target: IFamilyPutRemove<TKey, TValue>,
	o: Focus<SKey, TValue, Fail, typeof REMOVE, IS_PRISM>,
): (t: TValue) => Fail | SKey
export function oneToOne<SValue, TValue, SKey, TKey, Fail, IS_PRISM, Command>(
	source: IFamily<SKey, SValue>,
	getTargetId: Init<TKey | undefined, [SValue]>,
	target: IFamily<TKey, TValue> | IFamilyPutRemove<TKey, TValue>,
	o: Focus<SKey, TValue, Fail, Command, IS_PRISM>,
) {
	const resolved = focus<TValue>()(o)
	function getTargetIdResolved(source: SValue | undefined) {
		if (isUndefined(source)) return undefined
		return fromInit(getTargetId, source)
	}
	source.subscribe((event) => {
		const { key, last, next } = event
		const parentOut = getTargetIdResolved(last)
		const parentIn = getTargetIdResolved(next)
		if (parentIn === parentOut) return
		if (parentOut !== undefined) {
			if (resolved.isCommand(REMOVE)) target.map(parentOut, resolved.update(REMOVE))
			else {
				isoAssert('remove' in target)
				target.remove(parentOut)
			}
		}
		if (parentIn !== undefined) {
			if (resolved.isCommand(REMOVE)) target.map(parentIn, resolved.update(key))
			else {
				isoAssert('remove' in target)
				target.put(parentIn, resolved.put(key, undefined as any)) // only for prisms
			}
		}
	})
	return resolved.view.bind(resolved)
}

export function manyToOne<SValue, TValue, SKey, TKey, Fail, Command>(
	source: IFamily<SKey, SValue>,
	getTargetIds: Init<TKey[], [SValue]>,
	target: IFamily<TKey, TValue> | IFamilyPutRemove<TKey, TValue>,
	o: Focus<SKey, TValue, Fail, NonRemove<Command>, PRISM>,
): (t: TValue) => Fail | SKey
export function manyToOne<SValue, TValue, SKey, TKey, Fail, IS_PRISM>(
	source: IFamily<SKey, SValue>,
	getTargetIds: Init<TKey[], [SValue]>,
	target: IFamily<TKey, TValue> | IFamilyPutRemove<TKey, TValue>,
	o: Focus<SKey, TValue, Fail, typeof REMOVE, IS_PRISM>,
): (t: TValue) => Fail | SKey
export function manyToOne<SValue, TValue, SKey, TKey, Fail, IS_PRISM, Command>(
	source: IFamily<SKey, SValue>,
	getTargetIds: Init<TKey[], [SValue]>,
	target: IFamily<TKey, TValue> | IFamilyPutRemove<TKey, TValue>,
	o: Focus<SKey, TValue, Fail, Command, IS_PRISM>,
) {
	const resolved = focus<TValue>()(o)
	function getTargetIdsResolved(source: SValue | undefined) {
		if (isUndefined(source)) return []
		return fromInit(getTargetIds, source)
	}
	source.subscribe((event) => {
		const { key, last, next } = event
		const [parentsOut, parentsIn] = symmetricDiff(
			getTargetIdsResolved(last),
			getTargetIdsResolved(next),
		)
		parentsOut.forEach((parentOut) => {
			if (resolved.isCommand(REMOVE)) target.map(parentOut, resolved.update(REMOVE))
			else {
				isoAssert('remove' in target)
				target.remove(parentOut)
			}
		})
		parentsIn.forEach((parentIn) => {
			if (resolved.isCommand(REMOVE)) target.map(parentIn, resolved.update(key))
			else {
				isoAssert('remove' in target)
				target.put(parentIn, resolved.put(key, undefined as any)) // only for prisms
			}
		})
	})
	return resolved.view.bind(resolved)
}

export function manyToMany<SValue, TValue, SKey, TKey, Fail, Command, IS_PRISM>(
	source: IFamily<SKey, SValue>,
	getTargetIds: Init<TKey[], [SValue]>,
	target: IFamily<TKey, TValue>,
	o: Focus<SKey[], TValue, Fail, Command, IS_PRISM>,
) {
	const resolved = focus<TValue>()(o)
	function getTargetIdsResolved(source: SValue | undefined) {
		if (isUndefined(source)) return []
		return fromInit(getTargetIds, source)
	}
	source.subscribe((event) => {
		const { key, last, next } = event
		const [parentsOut, parentsIn] = symmetricDiff(
			getTargetIdsResolved(last),
			getTargetIdsResolved(next),
		)
		parentsOut.forEach((parentOut) => target.map(parentOut, resolved.update(removeValue(key))))
		parentsIn.forEach((parentIn) => target.map(parentIn, resolved.update(insertValue(key))))
	})
	return resolved.view.bind(resolved)
}

export function oneToMany<SValue, TValue, SKey, TKey, Fail, Command, IS_PRISM>(
	source: IFamily<SKey, SValue>,
	getTargetId: Init<TKey | undefined, [SValue]>,
	target: IFamily<TKey, TValue>,
	o: Focus<SKey[], TValue, Fail, Command, IS_PRISM>,
) {
	const resolved = focus<TValue>()(o)
	function getTargetIdResolved(source: SValue | undefined) {
		if (isUndefined(source)) return undefined
		return fromInit(getTargetId, source)
	}
	source.subscribe((event) => {
		const { key, last, next } = event
		const parentOut = getTargetIdResolved(last)
		const parentIn = getTargetIdResolved(next)
		if (parentIn === parentOut) return
		if (parentOut !== undefined) target.map(parentOut, resolved.update(removeValue(key)))
		if (parentIn !== undefined) target.map(parentIn, resolved.update(insertValue(key)))
	})
	return resolved.view.bind(resolved)
}
