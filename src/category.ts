/* eslint-disable @typescript-eslint/no-explicit-any */
import { COptic, Focus, id, pipe, PRISM } from '@constellar/core'
import {
	Init,
	isoAssert,
	manyToMany,
	NonRemove,
	oneToIndex,
	oneToMany,
	oneToOne,
	opt,
	pro,
} from '@prncss-xyz/utils'
import { Level } from 'level'

import { db } from './db'
import { logger } from './logger'
import { asyncUpdater } from './utils/asyncUpdater'

export type UpdateEvent<Key, Value> = {
	key: Key
	last: undefined | Value
	next: undefined | Value
}

export interface ICategory<Key, Value> {
	entries: () => AsyncIterable<[Key, Value]>
	get: (key: Key) => Promise<undefined | Value>
	map: (key: Key, modify: (t: Value) => Value) => Promise<undefined | Value>
	subscribe: (callback: (event: UpdateEvent<Key, Value>) => void) => void
}

export interface ICategoryPutRemove<Key, Value> extends ICategory<Key, Value> {
	put: (key: Key, value: Value) => Promise<void>
	remove: (key: Key) => Promise<void>
}

export const categories = new Map<string, Category<any, any, any>>()

function getDefault<T>(): T[] {
	return []
}
function isDefault<T>(value: T[]): unknown {
	return value.length === 0
}

export type Event<Key, Value> = { key: Key; last: undefined | Value; next: undefined | Value }

type Opts<Value, Key> = Partial<{
	index: boolean
	merge: (next: Value, last: Value) => Promise<Value>
	rewrite: (next: Value, last: undefined | Value) => Promise<Value>
	shouldRemove: (value: Value, key: Key) => unknown
}>

function alwaysFalse() {
	return false
}

export type CategoryKey<Category> = Category extends ICategory<infer K, any> ? K : never
export type CategoryValue<Category> = Category extends ICategory<any, infer V> ? V : never

const categoryBrand = Symbol('categoryBrand')
export type BrandedKey<Prefix extends string> = string & { readonly [categoryBrand]: Prefix }

export function category<Prefix extends string>(prefix: Prefix) {
	return function <Value, Key = BrandedKey<Prefix>>(opts?: Opts<Value, Key>) {
		return new Category<Value, Prefix, Key>(prefix, opts)
	}
}

export function categoryWithDefault<Prefix extends string>(prefix: Prefix) {
	return function <Value, Key = BrandedKey<Prefix>>(
		defaultValue: (key: Key) => Value,
		opts?: Opts<Value, Key>,
	) {
		return new CategoryWithDefault<Value, Prefix, Key>(prefix, defaultValue, opts)
	}
}

export function categoryWithGenerate<Prefix extends string>(prefix: Prefix) {
	return function <Value, Key = BrandedKey<Prefix>>(
		generate: (key: Key) => Value,
		opts?: Opts<Value, Key>,
	) {
		return new CategoryWithGenerate<Value, Prefix, Key>(prefix, generate, opts)
	}
}

// TODO: infer type of Init and Value
export function categoryWithCreate<Prefix extends string>(prefix: Prefix) {
	return function <Value, Init, Key = BrandedKey<Prefix>>(
		creator: (init: Init) => [string, Value],
		opts?: Opts<Value, Key>,
	) {
		return new CategoryWithCreate<Value, Init, Prefix, Key>(prefix, creator, opts)
	}
}

export class Base<Value, Name extends string, Key> {
	//  the package does not provide types for sublevel
	private sublevel: Level<Key, Value>
	constructor(name: Name) {
		this.sublevel = db.sublevel<Key, Value>(name, { valueEncoding: 'json' }) as any
	}
	clear() {
		return this.sublevel.clear()
	}
	async del(key: Key) {
		await this.sublevel.del(key)
	}
	entries() {
		return this.sublevel.iterator()
	}
	async get(key: Key): Promise<undefined | Value> {
		return await this.sublevel.get(key)
	}
	async has(key: Key) {
		return Boolean(await this.sublevel.get(key))
	}
	keys() {
		return this.sublevel.keys()
	}
	async put(key: Key, next: Value) {
		await this.sublevel.put(key, next)
	}
	values() {
		return this.sublevel.values()
	}
}

export class Category<Value, Name extends string, Key>
	extends Base<Value, Name, Key>
	implements ICategory<Key, Value>
{
	index: boolean
	shouldRemove: (value: Value, key: Key) => unknown
	protected subscriptions = new Set<(event: Event<Key, Value>) => void>()
	private merger: (next: Value, last: Value) => Promise<Value>
	private promises = new Map<Key, Promise<undefined | Value>>()
	private queue = new Map<Key, (value: undefined | Value) => Promise<undefined | Value>>()
	private rewrite: (next: Value, last: undefined | Value) => Promise<Value>
	constructor(
		public readonly name: Name,
		opts?: Opts<Value, Key>,
	) {
		super(name)
		this.index = opts?.index ?? false
		this.shouldRemove = opts?.shouldRemove ?? alwaysFalse
		this.rewrite = opts?.rewrite ?? pro.unit
		this.merger = opts?.merge ?? pro.unit
		isoAssert(!categories.has(name), `category ${name} already exists`)
		categories.set(name, this)
	}
	static async dump(prefix?: string) {
		for (const [prefix_, category] of categories.entries()) {
			if (prefix && prefix_ !== prefix) continue
			logger.log(prefix_)
			for await (const entry of category.entries()) logger.log(JSON.stringify(entry))
		}
	}
	static async export(write: (prefix: string) => (key: unknown, value: unknown) => Promise<void>) {
		for (const [prefix, category] of Object.entries(categories)) {
			if (category.opts.index) continue
			const w = write(prefix)
			for await (const [key, value] of category.iterator()) await w(key, value)
		}
	}
	manyToMany<TKey, Fail, Command, IS_PRISM>(
		prefix: string,
		optic: COptic<TKey[], Value, Fail, Command, IS_PRISM>,
	) {
		return new ManyToMany(prefix, this, optic.view.bind(optic), getDefault<Key>, isDefault, id)
	}
	async map(key: Key, up: (last: Value) => Value) {
		return await this.modify(key, (last) => Promise.resolve(opt.chain(up)(last)))
	}
	merge(key: Key, next: Value) {
		return this.modify(key, (last) => pro.unit(last === undefined ? next : this.merger(next, last)))
	}
	modify(key: Key, up: ((last: undefined | Value) => Promise<Value>) | Value): Promise<Value>
	modify(
		key: Key,
		up: ((last: undefined | Value) => Promise<undefined | Value>) | undefined | Value,
	): Promise<undefined | Value>
	modify(
		key: Key,
		up: ((last: undefined | Value) => Promise<undefined | Value>) | undefined | Value,
	) {
		this.queue.set(
			key,
			pipe(
				this.queue.get(key) ?? ((x: undefined | Value) => Promise.resolve(x)),
				pro.chain(asyncUpdater(up)),
				pro.map(opt.chain((next) => (this.shouldRemove(next, key) ? undefined : next))),
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
					let next = await q(last)
					if (next !== last) {
						if (next === undefined) await this.del(key)
						else {
							next = await this.rewrite(next, last)
							await super.put(key, next)
						}
						this.subscriptions.forEach((cb) =>
							cb({
								key,
								last,
								next,
							}),
						)
					}
					resolve(next)
				}, 0)
			})
		this.promises.set(key, p)
		return p
	}
	oneToIndex(prefix: string, predicate: (v: Value) => unknown) {
		return new OneToIndex(prefix, this, predicate)
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
		await this.modify(key, next)
	}
	async remove(key: Key) {
		await this.modify(key, undefined)
	}
	subscribe(cb: (event: Event<Key, Value>) => void) {
		this.subscriptions.add(cb)
		return () => this.subscriptions.delete(cb)
	}
}

class CategoryWithDefault<Value, Prefix extends string, Key = BrandedKey<Prefix>> extends Category<
	Value,
	Prefix,
	Key
> {
	constructor(
		prefix: Prefix,
		private defaultValue: (key: Key) => Value,
		opts?: Opts<Value, Key>,
	) {
		super(prefix, opts)
	}
	async get(key: Key): Promise<Value> {
		return (await super.get(key)) ?? this.defaultValue(key)
	}
	async map(key: Key, up: (last: Value) => Value): Promise<Value> {
		return super.map(key, up) as Promise<Value>
	}
	async modify(
		key: Key,
		up: ((last: undefined | Value) => Promise<undefined | Value>) | undefined | Value,
	): Promise<Value> {
		return super.modify(key, up) as Promise<Value>
	}
}

class CategoryWithGenerate<Value, Prefix extends string, Key = BrandedKey<Prefix>> extends Category<
	Value,
	Prefix,
	Key
> {
	constructor(
		prefix: Prefix,
		private generate: (key: Key) => Value,
		opts?: Opts<Value, Key>,
	) {
		super(prefix, opts)
	}
	async get(key: Key): Promise<Value> {
		const last = await super.get(key)
		if (last !== undefined) return last
		const next = this.generate(key)
		await this.put(key, next)
		return next
	}
	async map(key: Key, up: (last: Value) => Value): Promise<Value> {
		return super.map(key, up) as Promise<Value>
	}
	async modify(
		key: Key,
		up: ((last: undefined | Value) => Promise<undefined | Value>) | undefined | Value,
	): Promise<Value> {
		return super.modify(key, up) as Promise<Value>
	}
}

class CategoryWithCreate<
	Value,
	Init,
	Prefix extends string,
	Key = BrandedKey<Prefix>,
> extends Category<Value, Prefix, Key> {
	constructor(
		prefix: Prefix,
		private creator: (init: Init) => [string, Value],
		opts?: Opts<Value, Key>,
	) {
		super(prefix, opts)
	}
	async create(init: Init) {
		const [key, next] = this.creator(init) as [Key, Value]
		const last = await this.get(key)
		isoAssert(
			last === undefined,
			`key '${key}' already exists for category ${this.name} (init = ${init})`,
		)
		await this.put(key, next)
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
> extends CategoryWithDefault<TValue, string, TKey> {
	back: (t: TValue) => SKey[]
	constructor(
		prefix: string,
		source: ICategory<SKey, SValue>,
		getTargetId: Init<TKey | undefined, [SValue]>,
		getDefault: () => TValue,
		shouldRemove: (value: TValue, key: TKey) => unknown,
		o: Focus<SKey[], TValue, Fail, Command, IS_PRISM>,
	) {
		super(prefix, getDefault, { index: true, shouldRemove })
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
> extends CategoryWithDefault<TValue, string, TKey> {
	back: (t: TValue) => Fail | SKey[]
	constructor(
		prefix: string,
		source: ICategory<SKey, SValue>,
		getTargetIds: Init<TKey[], [SValue]>,
		getDefault: () => TValue,
		shouldRemove: (value: TValue, key: TKey) => unknown,
		o: Focus<SKey[], TValue, Fail, Command, IS_PRISM>,
	) {
		super(prefix, getDefault, { index: true, shouldRemove })
		this.back = manyToMany(source, getTargetIds, this, o)
	}
}

export class OneToOne<SValue, TValue, SKey, TKey, Fail, Command> extends Category<
	TValue,
	string,
	TKey
> {
	back: (t: TValue) => Fail | SKey
	constructor(
		prefix: string,
		source: ICategory<SKey, SValue>,
		getTargetId: Init<TKey | undefined, [SValue]>,
		o: Focus<SKey, TValue, Fail, NonRemove<Command>, PRISM>,
	) {
		super(prefix, { index: true })
		this.back = oneToOne(source, getTargetId, this, o)
	}
}

export class OneToIndex<SValue, SKey> extends Category<true, string, SKey> {
	back: (t: SValue) => unknown
	source: ICategory<SKey, SValue>
	constructor(prefix: string, source: ICategory<SKey, SValue>, predicate: (v: SValue) => unknown) {
		super(prefix, { index: true })
		this.source = source
		this.back = oneToIndex(source, predicate, this)
	}
	async reset() {
		await this.clear()
		for await (const [key, value] of this.source.entries()) {
			if (this.back(value)) {
				await this.put(key, true)
			}
		}
	}
}
