import { curry1, id, insertValue, removeValue } from '@constellar/core'
import { program } from 'commander'

import { ChecksumToResource } from './categories/ChecksumToResource'
import { PathToResource } from './categories/PathToResource'
import { fTags, Resources } from './categories/Resource'
import { TagsToResources } from './categories/TagsToResources'
import { reset } from './db'
import { getFile, modFile } from './files/scan'

program.command('scan <filename>').action(async (filename) => {
	console.log(await getFile(filename, id))
})

const add = curry1(insertValue)
const del = curry1(removeValue)

program.command('dump').action(async () => {
	await Resources.dump()
	await ChecksumToResource.dump()
	await PathToResource.dump()
	await TagsToResources.dump()
})

program.command('addTag <tag> <filename>').action(async (tag, filename) => {
	console.log(await modFile(filename, fTags.update(add(tag))))
})

program.command('delTag <tag> <filename>').action(async (tag, filename) => {
	console.log(await modFile(filename, fTags.update(del(tag))))
})

program.command('getTags <filename>').action(async (filename) => {
	console.log(await getFile(filename, fTags.view.bind(fTags)))
})

program.command('listTags').action(async () => {})

program.command('reset').action(async () => {
	await reset()
})

program.parseAsync(process.argv)
