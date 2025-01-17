import { flow, pipe } from '@constellar/core'

import { ResourceToEntries } from '../categories/Entry'
import { getPathPrism } from '../categories/Entry/pathPrism'
import { scanFile } from '../categories/Entry/scanFile'
import { walkDirOrFiles, walkList } from '../categories/Entry/walkDir'
import { fTags, Resources, TagsToResources } from '../categories/Resource'
import { NameToTags, Tags } from '../categories/Tag'
import { getConfig } from '../config'
import { logger } from '../logger'
import { dedupeSorted, insertValue, removeValues } from '../utils/arrays'
import { assertDefined } from '../utils/isoAssert'
import { arr, pro, pros } from '../utils/monads'

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
			await Resources.map(entry.resource, fTags.update(insertValue(tagKey)))
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
		await Resources.map(entry.resource, fTags.update(removeValues(tagKeys)))
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
		await Resources.map(entry.resource, fTags.update(insertValue(tagKey)))
	})
}

export async function tagGet(filePath: string) {
	const entry = await scanFile(filePath)
	if (!entry) {
		logger.error('file not found:', filePath)
		return undefined
	}
	const names = await flow(
		Resources.get(entry.resource),
		pro.map(fTags.view.bind(fTags)),
		pros.chain(
			pipe(
				pro.unit,
				pro.chain(Tags.get.bind(Tags)),
				pro.map(pipe(assertDefined(), (tag) => tag.name, arr.unit)),
			),
		),
	)
	logger.log(dedupeSorted(names).join('\n'))
}

export async function listResourcesByTag(tagName: string) {
	const pathPrism = getPathPrism((await getConfig()).dirs)
	const tagKeys = await NameToTags.get(tagName)
	if (tagKeys.length === 0) {
		logger.error(`tag ${tagName} not found`)
		return
	}
	const filePaths = await flow(
		pro.unit(tagKeys),
		pros.chain(TagsToResources.get.bind(TagsToResources)),
		pros.chain(ResourceToEntries.get.bind(ResourceToEntries)),
		pros.chain(pipe(pathPrism.put.bind(pathPrism), (x) => Promise.resolve([x]))),
	)
	logger.log(dedupeSorted(filePaths).join('\n'))
}

export async function listAllTags() {
	const names: string[] = []
	for await (const [, { name }] of Tags.list()) {
		names.push(name)
	}
	logger.log(dedupeSorted(names).join('\n'))
}
