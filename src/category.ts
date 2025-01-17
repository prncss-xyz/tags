/* eslint-disable @typescript-eslint/no-explicit-any */
import { COptic, Focus, id, pipe, PRISM } from '@constellar/core'
import { Level } from 'level'

import { db } from './db'
import { logger } from './logger'
import { IFamily, manyToMany, NonRemove, oneToMany, oneToOne } from './relations'
import { Init } from './utils/fromInit'
import { asyncUpdater } from './utils/functions'
import { isoAssert } from './utils/isoAssert'
import { opt, pro } from './utils/monads'

export const categories = new Map<string, Category<any, any>>()

function getDefault<T>(): T[] {
	return []
}
function isDefault<T>(value: T[]): unknown {
	return value.length === 0
}

export type Event<Key, Value> = { key: Key } & { last: undefined | Value; next: undefined | Value }

type Opts<Key, Value> = Partial<{
	index: boolean
	shouldRemove: (key: Key, value: Value) => unknown
}>

function alwaysFalse() {
	return false
}

export type FamilyToKey<Family> = Family extends IFamily<infer K, any> ? K : never
export type FamilyToValue<Family> = Family extends IFamily<any, infer V> ? V : never

export class Category<Key, Value> implements IFamily<Key, Value> {
	index: boolean
	shouldRemove: (key: Key, value: Value) => unknown
	protected sublevel: Level<Key, Value>
	protected subscriptions = new Set<(event: Event<Key, Value>) => void>()
	private promises = new Map<Key, Promise<undefined | Value>>()
	private queue = new Map<Key, (value: undefined | Value) => Promise<undefined | Value>>()
	constructor(
		protected prefix: string,
		opts?: Opts<Key, Value>,
	) {
		this.index = opts?.index ?? false
		this.shouldRemove = opts?.shouldRemove ?? alwaysFalse
		isoAssert(!categories.has(prefix), `category ${prefix} already exists`)
		categories.set(prefix, this)
		//  the package do not provide types for sublevel
		this.sublevel = db.sublevel<Key, Value>(prefix, { valueEncoding: 'json' }) as any
	}
	static async dump() {
		for (const [prefix, category] of categories.entries()) {
			logger.log(prefix)
			for await (const entry of category.sublevel.iterator()) logger.log(entry)
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
	async has(key: Key) {
		return Boolean(await this.sublevel.get(key))
	}
	keys(
		opts?: Partial<{
			gt: Key
			gte: Key
			limit: number
			lt: Key
			lte: Key
			reverse: boolean
		}>,
	) {
		return this.sublevel.keys(opts ?? {})
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
	async map(key: Key, up: (last: Value) => Value) {
		await this.modify(key, (last) => Promise.resolve(opt.chain(up)(last)))
	}
	modify(
		key: Key,
		up: ((last: undefined | Value) => Promise<undefined | Value>) | undefined | Value,
	) {
		this.queue.set(
			key,
			pipe(
				this.queue.get(key) ?? ((x: undefined | Value) => Promise.resolve(x)),
				pro.chain(asyncUpdater(up)),
				pro.map(opt.chain((next) => (this.shouldRemove(key, next) ? undefined : next))),
			),
		)
		const p =
			this.promises.get(key) ??
			new Promise((resolve) => {
				setTimeout(async () => {
					const q = this.queue.get(key)
					isoAssert(q)
					this.queue.delete(key)
					this.promises.delete(key)
					const last = await this.get(key)
					const next = await q(last)
					if (next === undefined) await this.sublevel.del(key)
					else await this.sublevel.put(key, next)
					this.subscriptions.forEach((cb) =>
						cb({
							key,
							last,
							next,
						}),
					)
					resolve(next)
				}, 0)
			})
		this.promises.set(key, p)
		return p
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
		return this.modify(key, next)
	}
	async remove(key: Key) {
		return this.modify(key, undefined)
	}
	subscribe(cb: (event: Event<Key, Value>) => void) {
		this.subscriptions.add(cb)
		return () => this.subscriptions.delete(cb)
	}
}

export class CategoryWithDefault<Key, Value> extends Category<Key, Value> {
	constructor(
		prefix: string,
		private defaultValue: (key: Key) => Value,
		isDefault: (key: Key, value: Value) => unknown,
		opts?: { index: boolean },
	) {
		super(prefix, { ...opts, shouldRemove: isDefault })
	}
	async get(key: Key): Promise<Value> {
		return (await this.sublevel.get(key)) ?? this.defaultValue(key)
	}
}

export class CategoryWithCreate<Key, Value, Init> extends Category<Key, Value> {
	constructor(
		prefix: string,
		private creator: (init: Init) => [Key, Value],
		opts?: Opts<Key, Value>,
	) {
		super(prefix, opts)
	}
	async create(init: Init) {
		const [key, next] = this.creator(init)
		const last = await this.get(key)
		isoAssert(
			last === undefined,
			`key '${key}' already exists for category ${this.prefix} (init = ${init})`,
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
		super(prefix, getDefault, (_key, value) => isDefault(value), { index: true })
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
		super(prefix, getDefault, (_key, value) => isDefault(value), { index: true })
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
