import { flow, id, pipe } from '@constellar/core'
import {
	assertDefined,
	asyncIter,
	bind,
	filtered,
	getProp,
	included,
	insertSorted,
	opt,
	pro,
	shuffledSink,
	sortedSink,
	voidSink,
} from '@prncss-xyz/utils'

import { ResourceToEntries } from '../categories/Entry'
import { getPathPrism } from '../categories/Entry/pathPrism'
import { walkDirOrFiles, walkList } from '../categories/Entry/walkDir'
import { Lamport } from '../categories/Lamport'
import {
	fTags,
	fTagsGet,
	Resources,
	TagsToResources,
	UntaggedResources,
} from '../categories/Resource'
import { scanFile } from '../categories/scanFile'
import { fName, NameToTags, Tags } from '../categories/Tag'
import { getConfig } from '../config'
import { logger } from '../logger'
import { matchTag } from '../utils/match-tag'

async function nameToTagOrCreate(name: string) {
	return flow(
		name,
		bind(NameToTags, 'get'),
		pro.map(getProp(0)),
		pro.map(opt.or(Tags.create(name))),
	)
}

export async function tagAddList(name: string, filePaths: string[]) {
	const tagKey = await nameToTagOrCreate(name)
	const lamport = await Lamport.get('singleton')
	await flow(
		filePaths,
		asyncIter.chain(walkList),
		asyncIter.map(
			pipe(
				id,
				scanFile,
				pro.map(
					opt.map((entry) =>
						Resources.map(
							entry.resource,
							fTags(entry.resource, lamport).update(insertSorted(tagKey)),
						),
					),
				),
			),
		),
		asyncIter.collect(voidSink()),
	)
}

export async function tagDel(name: string, filePaths: string[]) {
	const tagKeys = await NameToTags.get(name)
	const lamport = await Lamport.get('singleton')
	await flow(
		filePaths,
		walkDirOrFiles,
		asyncIter.map(pipe(id, scanFile)),
		asyncIter.map(
			opt.map((entry) =>
				Resources.map(
					entry.resource,
					fTags(entry.resource, lamport).update(filtered(included(tagKeys))),
				),
			),
		),
		asyncIter.collect(voidSink()),
	)
}

export async function tagAdd(name: string, filePaths: string[]) {
	const tagKey = await nameToTagOrCreate(name)
	const lamport = await Lamport.get('singleton')
	await flow(
		filePaths,
		walkDirOrFiles,
		asyncIter.map(
			pipe(
				id,
				scanFile,
				pro.map(
					opt.map((entry) =>
						Resources.map(
							entry.resource,
							fTags(entry.resource, lamport).update(insertSorted(tagKey)),
						),
					),
				),
			),
		),
		asyncIter.collect(voidSink()),
	)
}

export async function tagGet(filePath: string) {
	const entry = await scanFile(filePath)
	if (!entry) {
		logger.error('file not found:', filePath)
		process.exit(1)
	}
	const res = await flow(
		Resources.get(entry.resource),
		pro.map(bind(fTagsGet, 'view')),
		asyncIter.chain(
			pipe(
				bind(Tags, 'get'),
				pro.map(pipe(assertDefined())),
				pro.map(bind(fName(), 'view')),
				pro.map(opt.toIter),
			),
		),
		asyncIter.collect(sortedSink()),
	)
	if (res.length === 0) {
		logger.error(`no tags found for file: ${filePath}`)
		process.exit(1)
	}
	res.forEach(pipe(id, logger.log))
}

export async function tagMv(source: string, target: string) {
	const tags = await NameToTags.get(source)
	if (tags.length === 0) {
		logger.error(`no tags found for source: ${source}`)
		process.exit(1)
	}
	return Promise.all(tags.map(async (tag) => Tags.map(tag, fName().update(target))))
}

export async function listResourcesByTag(
	positive: string | undefined,
	negative: string | undefined,
	shuffle: boolean | undefined,
) {
	if (!(positive || negative)) {
		logger.error('no pattern specified')
		process.exit(1)
	}
	const config = await getConfig()
	const pathPrism = getPathPrism(config.dirs)
	const res = await flow(
		Tags.entries(),
		asyncIter.filter(pipe(getProp(1), bind(fName(), 'view'), matchTag(positive, negative))),
		asyncIter.map(getProp(0)),
		asyncIter.chain(bind(TagsToResources, 'get')),
		asyncIter.chain(bind(ResourceToEntries, 'get')),
		asyncIter.map(bind(pathPrism, 'put')),
		asyncIter.collect(shuffle ? shuffledSink() : sortedSink()),
	)
	if (res.length === 0) {
		logger.error(`no files found for tag: ${positive}`)
		process.exit(1)
	}
	res.forEach(pipe(id, logger.log))
}

export async function listAllTags() {
	const res = await flow(
		Tags.values(),
		asyncIter.map(pipe(bind(fName(), 'view'))),
		// remote empty strings, which represent deleted tags
		asyncIter.filter(Boolean),
		asyncIter.collect(sortedSink()),
	)
	if (res.length === 0) {
		logger.error(`no tags found`)
		process.exit(1)
	}
	res.forEach(pipe(id, logger.log))
}

export async function listUntagged(shuffle: boolean | undefined) {
	const config = await getConfig()
	const pathPrism = getPathPrism(config.dirs)
	const res = await flow(
		UntaggedResources.keys(),
		asyncIter.chain(bind(ResourceToEntries, 'get')),
		asyncIter.map(bind(pathPrism, 'put')),
		asyncIter.collect(shuffle ? shuffledSink() : sortedSink()),
	)
	if (res.length === 0) {
		logger.error(`no tags found`)
		process.exit(1)
	}
	res.forEach(pipe(id, logger.log))
}
