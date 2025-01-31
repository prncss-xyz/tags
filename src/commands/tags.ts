import { flow, pipe } from '@constellar/core'
import { arr, insertSorted, insertValue, join, pro, removeValues, sort } from '@prncss-xyz/utils'

import { ResourceToEntries } from '../categories/Entry'
import { getPathPrism } from '../categories/Entry/pathPrism'
import { walkDirOrFiles, walkList } from '../categories/Entry/walkDir'
import { Lamport } from '../categories/Lamport'
import { fTags, Resources, TagsToResources } from '../categories/Resource'
import { scanFile } from '../categories/scanFile'
import { fName, NameToTags, Tags } from '../categories/Tag'
import { getConfig } from '../config'
import { logger } from '../logger'
import { dedupeSorted } from '../utils/arrays'
import { accumulator } from '../utils/arrumulator'
import { pros } from '../utils/monads'

async function nameToTagOrCreate(name: string) {
	const tagKeys = await NameToTags.get(name)
	const head = tagKeys[0]
	if (head !== undefined) return head
	return await Tags.create(name)
}

export async function tagAddList(name: string, filePaths: string[]) {
	const tagKey = await nameToTagOrCreate(name)
	for (const filePath of filePaths) {
		await walkList(filePath, async (filePath) => {
			const entry = await scanFile(filePath)
			if (entry === undefined) {
				logger.error('file not found:', filePath)
				return undefined
			}
			const lamport = await Lamport.get('singleton')
			await Resources.map(
				entry.resource,
				fTags(entry.resource, lamport).update(insertValue(tagKey)),
			)
		})
	}
}

export async function tagDel(name: string, filePaths: string[]) {
	const tagKeys = await NameToTags.get(name)
	await walkDirOrFiles(filePaths, async (filePath) => {
		const entry = await scanFile(filePath)
		if (entry === undefined) {
			logger.error('file not found:', filePath)
			return undefined
		}
		const lamport = await Lamport.get('singleton')
		await Resources.map(
			entry.resource,
			fTags(entry.resource, lamport).update(removeValues(tagKeys)),
		)
	})
}

export async function tagAdd(name: string, filePaths: string[]) {
	const tagKey = await nameToTagOrCreate(name)
	await walkDirOrFiles(filePaths, async (filePath) => {
		const entry = await scanFile(filePath)
		if (entry === undefined) {
			logger.error('file not found:', filePath)
			return undefined
		}
		const lamport = await Lamport.get('singleton')
		await Resources.map(entry.resource, fTags(entry.resource, lamport).update(insertValue(tagKey)))
	})
}

export async function tagGet(filePath: string) {
	const entry = await scanFile(filePath)
	if (!entry) {
		logger.error('file not found:', filePath)
		return undefined
	}
	await flow(
		Resources.get(entry.resource),
		pro.map((v) => fTags().view(v)),
		pros.chain(
			pipe(
				pro.unit,
				pro.chain(Tags.get.bind(Tags)),
				pro.map((tag) => fName().view(tag!)),
				pro.map(arr.unit),
			),
		),
		pro.map(
			pipe(
				arr.tapZero(() => logger.error(`no tags found for file: ${filePath}`)),
				sort(),
				dedupeSorted,
				join('\n'),
				logger.log,
			),
		),
	)
}

export async function listResourcesByTag(tagName: string) {
	const config = await getConfig()
	const pathPrism = getPathPrism(config.dirs)
	flow(
		NameToTags.get(tagName),
		pros.chain(TagsToResources.get.bind(TagsToResources)),
		pros.chain(ResourceToEntries.get.bind(ResourceToEntries)),
		pros.chain(pipe(pathPrism.put.bind(pathPrism), pros.unit)),
		pros.tapZero(() => logger.error(`no files found for tag: ${tagName}`)),
		pro.map(pipe(sort(), dedupeSorted, join('\n'), logger.log)),
	)
}

export async function listAllTags() {
	const [up, res] = accumulator<string[]>([])
	for await (const [, entry] of Tags.list()) {
		up(insertSorted(fName().view(entry)))
	}
	for (const name of res()) {
		logger.log(name)
	}
}
