import { fTags, TagToResources } from '../categories/Resource'
import { getPathPrism } from '../categories/Resource/pathPrism'
import { NameToTags, Tags } from '../categories/Tag'
import { getConfig } from '../config'
import { logger } from '../logger'
import { dedupeSorted, insertValue, removeValues } from '../utils/arrays'
import { scanFile } from './scan'
import { walkDirOrFiles, walkList } from './walkDir'

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
			scanFile(filePath, async (last) => {
				if (last === undefined) {
					logger.error('file not found:', filePath)
					return undefined
				}
				return fTags.modify(insertValue(tagKey), last)
			})
		})
	}
}

export async function tagDel(name: string, filePaths: string[]) {
	const tagKeys = await NameToTags.get(name)
	await walkDirOrFiles(filePaths, async (filePath) => {
		scanFile(filePath, async (last) => {
			if (last === undefined) {
				logger.error('file not found:', filePath)
				return undefined
			}
			return fTags.modify(removeValues(tagKeys), last)
		})
	})
}

export async function tagAdd(name: string, filePaths: string[]) {
	const tagKey = await nameToTagOrCreate(name)
	await walkDirOrFiles(filePaths, async (filePath) => {
		scanFile(filePath, async (last) => {
			if (last === undefined) {
				logger.error('file not found:', filePath)
				return undefined
			}
			return fTags.modify(insertValue(tagKey), last)
		})
	})
}

export async function tagGet(filePath: string) {
	const resource = await scanFile(filePath)
	if (!resource) {
		logger.error('file not found:', filePath)
		return undefined
	}
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
