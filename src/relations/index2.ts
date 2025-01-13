/* eslint-disable @typescript-eslint/no-explicit-any */
import { focus, Focus, isUndefined, PRISM, REMOVE } from '@constellar/core'

import { Category } from '../category'
import { insertValue, removeValue, symmetricDiff } from '../utils/arrays'
import { fromInit, Init } from '../utils/fromInit'

export type UpdateEvent<Key, Value> = {
	key: Key
	last: undefined | Value
	next: undefined | Value
}

function always() {
	return true as const
}

interface ICategory<Key, Value> {
	put: (key: Key, value: Value) => void
	remove: (key: Key) => void
	update: (key: Key, modify: (t: Value) => Value) => void
  subscribe: (callback: (event: UpdateEvent<Key, Value>) => void) => void
}

	function oneToOne<SKey, SValue, TKey, TValue, Fail, Command, Cond = true>(
		source: ICategory<SKey, SValue>,
		getTargetId: Init<TKey, [SValue]>,
		target: ICategory<TKey, TValue>,
		o: Focus<SKey, TValue, Fail, NonRemove<Command>, PRISM>,
		cond?: (s: SValue) => Cond,
	): readonly [
		(source: SValue) => (Cond extends true ? never : undefined) | TKey,
		(t: TValue) => Fail | SKey,
	]
	function oneToOne<SKey, SValue, TKey, TValue, Fail, IS_PRISM, Cond = true>(
		source: ICategory<SKey, SValue>,
		getTargetId: Init<TKey, [SValue]>,
		target: ICategory<TKey, TValue>,
		o: Focus<SKey, TValue, Fail, typeof REMOVE, IS_PRISM>,
		cond?: (s: SValue) => Cond,
	): readonly [
		(source: SValue) => (Cond extends true ? never : undefined) | TKey,
		(t: TValue) => Fail | SKey,
	]
	function oneToOne<SKey, SValue, TKey, TValue, Fail, Command, IS_PRISM, Cond = true>(
		source: ICategory<SKey, SValue>,
		getTargetId: Init<TKey, [SValue]>,
		target: ICategory<TKey, TValue>,
		o: Focus<SKey, TValue, Fail, Command, IS_PRISM>,
		cond: (s: SValue) => Cond = always as any,
	) {
		const [propagate, forward, backward] = oneToOneRaw(getTargetId, o, cond)
		source.subscribe((event) => {
			propagate(event, {
				put: target.put.bind(target),
				remove: target.remove.bind(target),
				update: target.update.bind(target),
			})
		})
		return [forward, backward] as const
	}
	return {
		manyToMany<SKey, SValue, TKey, TValue, Fail, Command, IS_PRISM, Cond = true>(
			source: Category<SKey, SValue>,
			getTargetsId: Init<TKey[], [SValue]>,
			target: Category<TKey, TValue>,
			o: Focus<SKey[], TValue, Fail, Command, IS_PRISM>,
			cond: (s: SValue) => Cond = always as any,
		) {
			const [propagate, forward, backward] = manyToManyRaw(getTargetsId, o, cond)
			source.subscribe((event) => propagate(event, { update: update(target) }))
			return [forward, backward]
		},
		oneToMany<SKey, SValue, TKey, TValue, Fail, Command, IS_PRISM, Cond = true>(
			source: Category<SKey, SValue>,
			getTargetId: Init<TKey, [SValue]>,
			target: Category<TKey, TValue>,
			o: Focus<SKey[], TValue, Fail, Command, IS_PRISM>,
			cond: (s: SValue) => Cond = always as any,
		) {
			const [propagate, forward, backward] = oneToManyRaw(getTargetId, o, cond)
			source.subscribe((event) => propagate(event, { update: update(target) }))
			return [forward, backward] as const
		},
		oneToOne,
	}
}

type NonRemove<T> = T extends typeof REMOVE ? never : T

function oneToOneRaw<SValue, TValue, SKey, TKey, Command, Fail, Cond = true>(
	getTargetId: Init<TKey, [SValue]>,
	o: Focus<SKey, TValue, Fail, NonRemove<Command>, PRISM>,
	cond?: (s: SValue) => Cond,
): readonly [
	(
		event: UpdateEvent<SKey, SValue>,
		{
			put,
			remove,
			update,
		}: {
			put: (targetKey: TKey, value: TValue) => void
			remove: (targetKey: TKey) => void
			update: (targetKey: TKey, modify: (t: TValue) => TValue) => void
		},
	) => void,
	(source: SValue) => (Cond extends true ? never : undefined) | TKey,
	(t: TValue) => Fail | SKey,
]
function oneToOneRaw<SValue, TValue, SKey, TKey, Fail, IS_PRISM, Cond = true>(
	getTargetId: Init<TKey, [SValue]>,
	o: Focus<SKey, TValue, Fail, typeof REMOVE, IS_PRISM>,
	cond?: (s: SValue) => Cond,
): readonly [
	(
		event: UpdateEvent<SKey, SValue>,
		{
			put,
			remove,
			update,
		}: {
			put: (targetKey: TKey, value: TValue) => void
			remove: (targetKey: TKey) => void
			update: (targetKey: TKey, modify: (t: TValue) => TValue) => void
		},
	) => void,
	(source: SValue) => (Cond extends true ? never : undefined) | TKey,
	(t: TValue) => Fail | SKey,
]
// This type overload is only to make bindings possible, not suitable for use in consumer code
function oneToOneRaw<SValue, TValue, SKey, TKey, Fail, IS_PRISM, Command, Cond = true>(
	getTargetId: Init<TKey, [SValue]>,
	o: Focus<SKey, TValue, Fail, Command, IS_PRISM>,
	cond?: (s: SValue) => Cond,
): readonly [
	(
		event: UpdateEvent<SKey, SValue>,
		{
			put,
			remove,
			update,
		}: {
			put: (targetKey: TKey, value: TValue) => void
			remove: (targetKey: TKey) => void
			update: (targetKey: TKey, modify: (t: TValue) => TValue) => void
		},
	) => void,
	(source: SValue) => (Cond extends true ? never : undefined) | TKey,
	(t: TValue) => Fail | SKey,
]
function oneToOneRaw<SValue, TValue, SKey, TKey, Fail, IS_PRISM, Command, Cond = true>(
	getTargetId: Init<TKey, [SValue]>,
	o: Focus<SKey, TValue, Fail, Command, IS_PRISM>,
	cond: (s: SValue) => Cond = always as any,
) {
	const resolved = focus<TValue>()(o)
	function getTargetIdResolved(source: SValue | undefined) {
		if (isUndefined(source) || !cond(source)) return undefined
		return fromInit(getTargetId, source)
	}
	const getSourceId: (t: TValue) => Fail | SKey = resolved.view.bind(resolved)
	function propagate(
		event: UpdateEvent<SKey, SValue>,
		{
			put,
			remove,
			update,
		}: {
			put: (targetKey: TKey, value: TValue) => void
			remove: (targetKey: TKey) => void
			update: (targetKey: TKey, modify: (t: TValue) => TValue) => void
		},
	) {
		const { key, last, next } = event
		const parentOut = getTargetIdResolved(last)
		const parentIn = getTargetIdResolved(next)
		if (parentIn === parentOut) return
		if (parentOut !== undefined) {
			if (resolved.isCommand(REMOVE)) update(parentOut, resolved.update(REMOVE))
			else remove(parentOut)
		}
		if (parentIn !== undefined) {
			if (resolved.isCommand(REMOVE)) update(parentIn, resolved.update(key))
			else put(parentIn, resolved.put(key, undefined as any)) // only for prisms
		}
	}
	return [
		propagate,
		getTargetIdResolved as (source: SValue) => (Cond extends true ? never : undefined) | TKey,
		getSourceId,
	] as const
}

function manyToManyRaw<SValue, TValue, SKey, TKey, Fail, Command, IS_PRISM, Cond = true>(
	getTargetIds: Init<TKey[], [SValue]>,
	o: Focus<SKey[], TValue, Fail, Command, IS_PRISM>,
	cond: (s: SValue) => Cond = always as any,
) {
	const resolved = focus<TValue>()(o)
	function getTargetIdsResolved(source: SValue | undefined) {
		if (isUndefined(source) || !cond(source)) return []
		return fromInit(getTargetIds, source)
	}
	const getSourceIds: (t: TValue) => Fail | SKey[] = resolved.view.bind(resolved)
	function propagate(
		ctx: UpdateEvent<SKey, SValue>,
		{
			update,
		}: {
			update: (targetKey: TKey, modify: (t: TValue) => TValue) => void
		},
	) {
		const { key, last, next } = ctx
		const [parentsOut, parentsIn] = symmetricDiff(
			getTargetIdsResolved(last),
			getTargetIdsResolved(next),
		)
		parentsOut.forEach((parentOut) => update(parentOut, resolved.update(removeValue(key))))
		parentsIn.forEach((parentIn) => update(parentIn, resolved.update(insertValue(key))))
	}
	return [propagate, getTargetIdsResolved, getSourceIds] as const
}

function oneToManyRaw<SValue, TValue, SKey, TKey, Fail, Command, IS_PRISM, Cond = true>(
	getTargetId: Init<TKey, [SValue]>,
	o: Focus<SKey[], TValue, Fail, Command, IS_PRISM>,
	cond: (s: SValue) => Cond = always as any,
) {
	const resolved = focus<TValue>()(o)
	function getTargetIdResolved(source: SValue | undefined) {
		if (isUndefined(source) || !cond(source)) return undefined
		return fromInit(getTargetId, source)
	}
	const getSourceIds: (t: TValue) => Fail | SKey[] = resolved.view.bind(resolved)
	function propagate(
		ctx: UpdateEvent<SKey, SValue>,
		{
			update,
		}: {
			update: (targetKey: TKey, modify: (t: TValue) => TValue) => void
		},
	) {
		const { key, last, next } = ctx
		const parentOut = getTargetIdResolved(last)
		const parentIn = getTargetIdResolved(next)
		if (parentIn === parentOut) return
		if (parentOut !== undefined) update(parentOut, resolved.update(removeValue(key)))
		if (parentIn !== undefined) update(parentIn, resolved.update(insertValue(key)))
	}
	return [
		propagate,
		getTargetIdResolved as (source: SValue) => (Cond extends true ? never : undefined) | TKey,
		getSourceIds,
	] as const
}
