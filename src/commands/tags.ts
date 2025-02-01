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
import { fTags, Resources, TagsToResources } from '../categories/Resource'
import { scanFile } from '../categories/scanFile'
import { fName, NameToTags, Tags } from '../categories/Tag'
import { getConfig } from '../config'
import { logger } from '../logger'
import { matchTag } from '../utils/match-tag'

// TODO: notify
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
			asyncArr.map(assertDefined()),
			asyncArr.map((entry) =>
				Resources.map(entry.resource, fTags(entry.resource, lamport).update(insertValue(tagKey))),
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
		pro.map(bind(fTags(), 'view')),
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
		Tags.list(),
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
