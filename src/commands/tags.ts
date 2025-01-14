import { fTags, Resources, TagToResources } from '../categories/Resource'
import { getPathPrism } from '../categories/Resource/pathPrism'
import { NameToTags, Tags } from '../categories/Tag'
import { getConfig } from '../config'
import { logger } from '../logger'
import { dedupeSorted, insertValue, removeValues } from '../utils/arrays'
import { isoAssert } from '../utils/isoAssert'
import { scanFile } from './scan'
import { walkDirOrFiles, walkList } from './walkDir'

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

async function nameToTagsOrCreate(name: string) {
	const tagKeys = await NameToTags.get(name)
	const head = tagKeys[0]
	if (head !== undefined) return head
	return await Tags.create(name)
}

export async function tagAddList(name: string, filePaths: string[]) {
	for (const filePath of filePaths) {
		await walkList(filePath, async (filePath) => {
			const resourceKey = await scanFile(filePath)
			if (!resourceKey) {
				logger.error('file not found:', filePath)
				return
			}
			const tagKey = await nameToTagsOrCreate(name)
			// FIXME: transaction or cache
			await delay(10)
			await Resources.update(resourceKey, fTags.update(insertValue(tagKey)))
		})
	}
}

export async function tagAdd(name: string, filePaths: string[]) {
	await walkDirOrFiles(filePaths, async (filePath) => {
		const resourceKey = await scanFile(filePath)
		if (!resourceKey) {
			logger.error('file not found:', filePath)
			return
		}
		const tagKey = await nameToTagsOrCreate(name)
		// FIXME: transaction or cache
		await delay(10)
		await Resources.update(resourceKey, fTags.update(insertValue(tagKey)))
	})
}

export async function tagGet(filePath: string) {
	const resourceKey = await scanFile(filePath)
	if (!resourceKey) {
		logger.error('file not found:', filePath)
		return
	}
	const resource = await Resources.get(resourceKey)
	isoAssert(resource !== undefined)
	const tagKeys = fTags.view(resource)
	const names = await Promise.all(
		tagKeys.map((tagKey) => Tags.get(tagKey).then((tag) => tag!.name)),
	)
	names.sort()
	logger.log(dedupeSorted(names).join('\n'))
}

export async function listResourcesByTag(tagName: string) {
	const tagKeys = await NameToTags.get(tagName)
	if (tagKeys.length === 0) {
		logger.error(`tag ${tagName} not found`)
		return
	}

	const pathPrism = getPathPrism((await getConfig()).dirs)
	const filePaths = (
		await Promise.all(
			tagKeys.map((tagKey) =>
				TagToResources.get(tagKey).then((resourceKeys) =>
					resourceKeys.map((resourceKey) => pathPrism.put(resourceKey)),
				),
			),
		)
	).flat()
	filePaths.sort()
	logger.log(dedupeSorted(filePaths.join('\n')))
}

export async function listAllTags() {
	const names: string[] = []
	for await (const [, { name }] of Tags.list()) {
		names.push(name)
	}
	names.sort()
	logger.log(dedupeSorted(names.join('\n')))
}

export async function tagDel(name: string, filePaths: string[]) {
	await walkDirOrFiles(filePaths, async (filePath) => {
		const resourceKey = await scanFile(filePath)
		if (!resourceKey) {
			logger.error('file not found:', filePath)
			return
		}
		const tagKeys = await NameToTags.get(name)
		if (!tagKeys) return
		await Resources.update(resourceKey, fTags.update(removeValues(tagKeys)))
	})
}
