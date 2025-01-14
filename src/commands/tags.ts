import assert from 'node:assert'

import { fTags, Resources, TagToResources } from '../categories/Resource'
import { getPathPrism } from '../categories/Resource/pathPrism'
import { NameToTags, Tags } from '../categories/Tag'
import { getConfig } from '../config'
import { log } from '../log'
import { dedupeSorted, insertValue, removeValues } from '../utils/arrays'
import { scanFile } from './scan'

async function nameToTagsOrCreate(name: string) {
	const tagKeys = await NameToTags.get(name)
	const head = tagKeys[0]
	if (head !== undefined) return head
	return await Tags.create(name)
}

export async function addTag(name: string, filePaths: string[]) {
	for (const filePath of filePaths) {
		const resourceKey = await scanFile(filePath)
		if (!resourceKey) {
			log.error('file not found:', filePath)
			return
		}
		const tagKey = await nameToTagsOrCreate(name)
		await Resources.update(resourceKey, fTags.update(insertValue(tagKey)))
	}
}

export async function getTags(filePath: string) {
	const resourceKey = await scanFile(filePath)
	if (!resourceKey) {
		log.error('file not found:', filePath)
		return
	}
	const resource = await Resources.get(resourceKey)
	assert(resource !== undefined)
	const tagKeys = fTags.view(resource)
	const names = await Promise.all(
		tagKeys.map((tagKey) => Tags.get(tagKey).then((tag) => tag!.name)),
	)
	names.sort()
	log.log(dedupeSorted(names).join('\n'))
}

export async function listResourcesByTag(tagName: string) {
	const tagKeys = await NameToTags.get(tagName)
	if (tagKeys.length === 0) {
		log.error(`tag ${tagName} not found`)
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
	log.log(dedupeSorted(filePaths.join('\n')))
}

export async function listTags() {
	const names: string[] = []
	for await (const [, { name }] of Tags.list()) {
		names.push(name)
	}
	names.sort()
	log.log(dedupeSorted(names.join('\n')))
}

export async function delTag(name: string, filePaths: string[]) {
	for (const filePath of filePaths) {
		const resourceKey = await scanFile(filePath)
		if (!resourceKey) {
			log.error('file not found:', filePath)
			return
		}
		const tagKeys = await NameToTags.get(name)
		if (!tagKeys) return
		await Resources.update(resourceKey, fTags.update(removeValues(tagKeys)))
	}
}
