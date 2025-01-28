import { flow, pipe } from '@constellar/core'
import { arr, assertDefined, insertSorted, insertValue, pro, removeValues } from '@prncss-xyz/utils'

import { ResourceToEntries } from '../categories/Entry'
import { getPathPrism } from '../categories/Entry/pathPrism'
import { walkDirOrFiles, walkList } from '../categories/Entry/walkDir'
import { fTags, Resources, TagsToResources } from '../categories/Resource'
import { scanFile } from '../categories/scanFile'
import { NameToTags, Tags } from '../categories/Tag'
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
	const config = await getConfig()
	const pathPrism = getPathPrism(config.dirs)

	const filePaths = await flow(
		NameToTags.get(tagName),
		pro.map(arr.tapZero(() => logger.error('tag not found:', tagName))),
		pros.chain(TagsToResources.get.bind(TagsToResources)),
		pros.chain(ResourceToEntries.get.bind(ResourceToEntries)),
		pros.chain(pipe(pathPrism.put.bind(pathPrism), pros.unit)),
	)
	logger.log(dedupeSorted(filePaths).join('\n'))
}

export async function listAllTags() {
	const [up, res] = accumulator<string[]>([])
	for await (const [, { name }] of Tags.list()) {
		up(insertSorted(name))
	}
	for (const name of res()) {
		logger.log(name)
	}
}
