import { flow, id, pipe } from '@constellar/core'
import {
	arr,
	assertDefined,
	asyncArr,
	asyncCollect,
	bind,
	insertValue,
	opt,
	pro,
	removeValues,
	shuffledSink,
	sortedSink,
	valueSink,
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
		pro.map((tagKeys) => tagKeys[0]),
		pro.map(opt.or(Tags.create(name))),
	)
}

export async function tagAddList(name: string, filePaths: string[]) {
	const tagKey = await nameToTagOrCreate(name)
	const lamport = await Lamport.get('singleton')
	await asyncCollect(
		flow(
			filePaths,
			asyncArr.chain(walkList),
			asyncArr.map(pipe(id, scanFile)),
			asyncArr.map(
				opt.map((entry) =>
					Resources.map(entry.resource, fTags(entry.resource, lamport).update(insertValue(tagKey))),
				),
			),
		),
	)(valueSink())
}

export async function tagDel(name: string, filePaths: string[]) {
	const tagKeys = await NameToTags.get(name)
	const lamport = await Lamport.get('singleton')
	await asyncCollect(
		flow(
			filePaths,
			walkDirOrFiles,
			asyncArr.map(pipe(id, scanFile)),
			asyncArr.map(
				opt.map((entry) =>
					Resources.map(
						entry.resource,
						fTags(entry.resource, lamport).update(removeValues(tagKeys)),
					),
				),
			),
		),
	)(valueSink())
}

export async function tagAdd(name: string, filePaths: string[]) {
	const tagKey = await nameToTagOrCreate(name)
	const lamport = await Lamport.get('singleton')
	await asyncCollect(
		flow(
			filePaths,
			walkDirOrFiles,
			asyncArr.map(pipe(id, scanFile)),
			asyncArr.map(
				opt.map((entry) =>
					Resources.map(entry.resource, fTags(entry.resource, lamport).update(insertValue(tagKey))),
				),
			),
		),
	)(valueSink())
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
		asyncArr.chain(
			pipe(
				pro.unit,
				pro.chain(bind(Tags, 'get')),
				pro.map(assertDefined()),
				pro.map(bind(fName(), 'view')),
				pro.map(arr.unit),
			),
		),
		asyncArr.filter(Boolean),
		asyncArr.collect(sortedSink()),
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
		asyncArr.filter(pipe((x) => x[1], bind(fName(), 'view'), matchTag(positive, negative))),
		asyncArr.map((x) => x[0]),
		asyncArr.chain(bind(TagsToResources, 'get')),
		asyncArr.chain(bind(ResourceToEntries, 'get')),
		asyncArr.map(bind(pathPrism, 'put')),
		asyncArr.collect(shuffle ? shuffledSink() : sortedSink()),
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
		asyncArr.map(bind(fName(), 'view')),
		asyncArr.filter(Boolean),
		asyncArr.collect(sortedSink()),
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
		asyncArr.chain(bind(ResourceToEntries, 'get')),
		asyncArr.map(bind(pathPrism, 'put')),
		asyncArr.collect(shuffle ? shuffledSink() : sortedSink()),
	)
	if (res.length === 0) {
		logger.error(`no tags found`)
		process.exit(1)
	}
	res.forEach(pipe(id, logger.log))
}
