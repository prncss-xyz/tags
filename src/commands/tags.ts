import { ResourceToEntries } from '../categories/Entry'
import { getPathPrism } from '../categories/Entry/pathPrism'
import { scanFile } from '../categories/Entry/scanFile'
import { walkDirOrFiles, walkList } from '../categories/Entry/walkDir'
import { fTags, Resources, TagsToResources } from '../categories/Resource'
import { NameToTags, Tags } from '../categories/Tag'
import { getConfig } from '../config'
import { logger } from '../logger'
import { dedupeSorted, insertValue, removeValues } from '../utils/arrays'
import { isoAssert } from '../utils/isoAssert'

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
	const resource = await Resources.get(entry.resource)
	const names = (
		await Promise.all(
			fTags.view(resource).map(async (tagKey) => {
				const tag = await Tags.get(tagKey)
				isoAssert(tag !== undefined)
				return tag
			}),
		)
	)
		.map((tag) => tag.name)
		.sort()
	logger.log(dedupeSorted(names).join('\n'))
}

export async function listResourcesByTag(tagName: string) {
	const pathPrism = getPathPrism((await getConfig()).dirs)
	const tagKeys = await NameToTags.get(tagName)
	if (tagKeys.length === 0) {
		logger.error(`tag ${tagName} not found`)
		return
	}
	const resourceKeys = (
		await Promise.all(tagKeys.map((tagKey) => TagsToResources.get(tagKey)))
	).flat()
	const fileKeys = (
		await Promise.all(resourceKeys.map((resourceKey) => ResourceToEntries.get(resourceKey)))
	).flat()
	const filePaths = fileKeys.map((fileKey) => pathPrism.put(fileKey)).sort()
	logger.log(dedupeSorted(filePaths).join('\n'))
}

export async function listAllTags() {
	const names: string[] = []
	for await (const [, { name }] of Tags.list()) {
		names.push(name)
	}
	names.sort()
	logger.log(dedupeSorted(names).join('\n'))
}
