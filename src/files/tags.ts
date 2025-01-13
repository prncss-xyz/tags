import assert from 'node:assert'

import { fTags, Resources } from '../categories/Resource'
import { NameToTags, Tags } from '../categories/Tag'
import { insertValue, removeValues } from '../utils/arrays'
import { scanFile } from './scan'

async function nameToTagsOrCreate(name: string) {
	const tagKeys = await NameToTags.get(name)
	const head = tagKeys[0]
	if (head !== undefined) return head
	return await Tags.create(name)
}

export async function addTag(name: string, filePath: string) {
	const resourceKey = await scanFile(filePath)
	if (!resourceKey) {
		console.error('file not found:', filePath)
		return
	}
	const tagKey = await nameToTagsOrCreate(name)
	await Resources.update(resourceKey, fTags.update(insertValue(tagKey)))
}

export async function getTags(filePath: string) {
	const resourceKey = await scanFile(filePath)
	if (!resourceKey) {
		console.error('file not found:', filePath)
		return
	}
	const resource = await Resources.get(resourceKey)
	assert(resource !== undefined)
	const tagKeys = fTags.view(resource)
	const names = await Promise.all(
		tagKeys.map((tagKey) => Tags.get(tagKey).then((tag) => tag!.name)),
	)
	console.log(names)
}

export async function listTags() {
	const names: string[] = []
	for await (const [, { name }] of Tags.list()) {
		names.push(name)
	}
	console.log(names)
}

export async function delTag(name: string, filePath: string) {
	const resourceKey = await scanFile(filePath)
	if (!resourceKey) {
		console.error('file not found:', filePath)
		return
	}
	const tagKeys = await NameToTags.get(name)
	if (!tagKeys) return
	await Tags.update(resourceKey, fTags.update(removeValues(tagKeys)))
}
