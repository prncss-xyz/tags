/* eslint-disable @typescript-eslint/no-explicit-any */
import { COptic, Focus, id, isFunction, PRISM } from '@constellar/core'
import { Level } from 'level'
import assert from 'node:assert'

import { db } from './db'
import { log } from './log'
import { IFamily, IFamilyPutRemove, manyToMany, NonRemove, oneToMany, oneToOne } from './relations'
import { Init } from './utils/fromInit'

export const categories = new Map<string, Category<any, any>>()

function getDefault<T>(): T[] {
	return []
}
function isDefault<T>(value: T[]): unknown {
	return value.length === 0
}

export type Event<Key, Value> = { key: Key } & { last: undefined | Value; next: undefined | Value }

type Opts = Partial<{ index: boolean }>

export type FamilyToKey<Family> = Family extends IFamily<infer K, any> ? K : never
export type FamilyToValue<Family> = Family extends IFamily<any, infer V> ? V : never

export class Category<Key, Value> implements IFamily<Key, Value> {
	index: boolean
	protected sublevel: Level<Key, Value>
	protected subscriptions = new Set<(event: Event<Key, Value>) => void>()
	constructor(
		protected prefix: string,
		opts?: Opts,
	) {
		this.index = opts?.index ?? false
		assert(!categories.has(prefix), `category ${prefix} already exists`)
		categories.set(prefix, this)
		//  the package do not provide types for sublevel
		this.sublevel = db.sublevel<Key, Value>(prefix, { valueEncoding: 'json' }) as any
	}
	static async dump() {
		for (const [prefix, category] of categories.entries()) {
			log.log(prefix)
			for await (const entry of category.sublevel.iterator()) log.log(entry)
		}
	}
	static async export(write: (prefix: string) => (key: unknown, value: unknown) => Promise<void>) {
		for (const [prefix, category] of Object.entries(categories)) {
			if (category.opts.index) continue
			const w = write(prefix)
			for await (const [key, value] of category.sublevel.iterator()) await w(key, value)
		}
	}
	async get(key: Key): Promise<undefined | Value> {
		return await this.sublevel.get(key)
	}
	list(
		opts?: Partial<{
			gt: Key
			gte: Key
			limit: number
			lt: Key
			lte: Key
			reverse: boolean
		}>,
	) {
		return this.sublevel.iterator(opts ?? {})
	}
	listen(cb: (Event: Event<Key, Value>, category: typeof this) => void) {
		return this.subscribe((event) => cb(event, this))
	}
	manyToMany<TKey, Fail, Command, IS_PRISM>(
		prefix: string,
		optic: COptic<TKey[], Value, Fail, Command, IS_PRISM>,
	) {
		return new ManyToMany(prefix, this, optic.view.bind(optic), getDefault<Key>, isDefault, id)
	}
	oneToMany<TKey, Fail, Command, IS_PRISM>(
		prefix: string,
		optic: COptic<TKey, Value, Fail, Command, IS_PRISM>,
	) {
		return new OneToMany(prefix, this, optic.view.bind(optic), getDefault<Key>, isDefault, id)
	}
	oneToOne<TKey, Fail, Command, IS_PRISM>(
		prefix: string,
		optic: COptic<TKey, Value, Fail, Command, IS_PRISM>,
	) {
		return new OneToOne(
			prefix,
			this,
			optic.view.bind(optic),
			id<COptic<Key, Key, never, never, PRISM>>,
		)
	}
	async put(key: Key, next: Value) {
		const last = await this.get(key)
		await this.sublevel.put(key, next)
		this.subscriptions.forEach((cb) =>
			cb({
				key,
				last,
				next,
			}),
		)
		return next
	}
	async remove(key: Key) {
		const last = await this.get(key)
		this.sublevel.del(key)
		this.subscriptions.forEach((cb) =>
			cb({
				key,
				last,
				next: undefined,
			}),
		)
	}
	subscribe(cb: (event: Event<Key, Value>) => void) {
		this.subscriptions.add(cb)
		return () => this.subscriptions.delete(cb)
	}
	async update(key: Key, up: ((last: Value) => Value) | undefined | Value) {
		const last = await this.get(key)
		let next: undefined | Value
		if (isFunction(up)) {
			const from = last
			assert(from !== undefined, `key ${key} has no default value for category ${this.prefix}`)
			next = up(from)
		} else if (up !== undefined) {
			return this.put(key, up)
		}
		if (next === undefined) {
			await this.remove(key)
			return undefined
		}
		await this.put(key, next)
		return next
	}
}

export class CategoryWithDefault<Key, Value>
	extends Category<Key, Value>
	implements IFamilyPutRemove<Key, Value>
{
	constructor(
		prefix: string,
		private defaultValue: (key: Key) => Value,
		private isDefault: (value: Value) => unknown,
		opts?: Opts,
	) {
		super(prefix, opts)
	}
	async get(key: Key): Promise<Value> {
		return (await this.sublevel.get(key)) ?? this.defaultValue(key)
	}
	async put(key: Key, next: Value) {
		const last = await this.get(key)
		if (this.isDefault(next)) await this.sublevel.del(key)
		else await this.sublevel.put(key, next)
		this.subscriptions.forEach((cb) =>
			cb({
				key,
				last,
				next,
			}),
		)
		return next
	}
}

export class CategoryWithPut<Key, Value>
	extends Category<Key, Value>
	implements IFamilyPutRemove<Key, Value>
{
	constructor(prefix: string, opts?: Opts) {
		super(prefix, opts)
	}
	async put(key: Key, next: Value) {
		const last = await this.get(key)
		await this.sublevel.put(key, next)
		this.subscriptions.forEach((cb) =>
			cb({
				key,
				last,
				next,
			}),
		)
		return next
	}
}

export class CategoryWithCreate<Key, Value, Init> extends Category<Key, Value> {
	constructor(
		prefix: string,
		private creator: (init: Init) => [Key, Value],
		opts?: Opts,
	) {
		super(prefix, opts)
	}
	async create(init: Init) {
		const [key, next] = this.creator(init)
		const last = await this.get(key)
		assert(
			last === undefined,
			`key ${key} already exists for category ${this.prefix} (init = ${init})`,
		)
		await this.sublevel.put(key, next)
		this.subscriptions.forEach((cb) =>
			cb({
				key,
				last,
				next,
			}),
		)
		return key
	}
}

export class OneToMany<
	SValue,
	TValue,
	SKey,
	TKey,
	Fail,
	Command,
	IS_PRISM,
> extends CategoryWithDefault<TKey, TValue> {
	back: (t: TValue) => SKey[]
	constructor(
		prefix: string,
		source: IFamily<SKey, SValue>,
		getTargetId: Init<TKey | undefined, [SValue]>,
		getDefault: () => TValue,
		isDefault: (value: TValue) => unknown,
		o: Focus<SKey[], TValue, Fail, Command, IS_PRISM>,
	) {
		super(prefix, getDefault, isDefault, { index: true })
		this.back = oneToMany(source, getTargetId, this, o)
	}
}

export class ManyToMany<
	SValue,
	TValue,
	SKey,
	TKey,
	Fail,
	Command,
	IS_PRISM,
> extends CategoryWithDefault<TKey, TValue> {
	back: (t: TValue) => Fail | SKey[]
	constructor(
		prefix: string,
		source: IFamily<SKey, SValue>,
		getTargetIds: Init<TKey[], [SValue]>,
		getDefault: () => TValue,
		isDefault: (value: TValue) => unknown,
		o: Focus<SKey[], TValue, Fail, Command, IS_PRISM>,
	) {
		super(prefix, getDefault, isDefault, { index: true })
		this.back = manyToMany(source, getTargetIds, this, o)
	}
}

export class OneToOne<SValue, TValue, SKey, TKey, Fail, Command> extends Category<TKey, TValue> {
	back: (t: TValue) => Fail | SKey
	constructor(
		prefix: string,
		source: IFamily<SKey, SValue>,
		getTargetId: Init<TKey | undefined, [SValue]>,
		o: Focus<SKey, TValue, Fail, NonRemove<Command>, PRISM>,
	) {
		super(prefix, { index: true })
		this.back = oneToOne(source, getTargetId, this, o)
	}
}
