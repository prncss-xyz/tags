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
			asyncArr.chain((x) => walkList(x)),
			asyncArr.map(scanFile),
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
			asyncArr.map(scanFile),
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
			asyncArr.map(scanFile),
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
		pro.map((v) => fTags().view(v)),
		asyncArr.chain(
			pipe(
				pro.unit,
				pro.chain(bind(Tags, 'get')),
				pro.map((tag) => fName().view(tag!)),
				pro.map(arr.unit),
			),
		),
		asyncArr.collect(sortedSink()),
	)
	if (res.length === 0) {
		logger.error(`no tags found for file: ${filePath}`)
		process.exit(1)
	}
	res.forEach(pipe(id, logger.log))
}

export async function listResourcesByTag(tagName: string) {
	const config = await getConfig()
	const pathPrism = getPathPrism(config.dirs)
	const res = await flow(
		NameToTags.get(tagName),
		asyncArr.chain(bind(TagsToResources, 'get')),
		asyncArr.chain(bind(ResourceToEntries, 'get')),
		asyncArr.map(bind(pathPrism, 'put')),
		asyncArr.collect(sortedSink()),
	)
	if (res.length === 0) {
		logger.error(`no files found for tag: ${tagName}`)
		process.exit(1)
	}
	res.forEach(pipe(id, logger.log))
}

export async function listAllTags() {
	const res = await flow(
		Tags.list(),
		asyncArr.map(([, entry]) => fName().view(entry)),
		asyncArr.collect(sortedSink()),
	)
	if (res.length === 0) {
		logger.error(`no tags found`)
		process.exit(1)
	}
	res.forEach(pipe(id, logger.log))
}
