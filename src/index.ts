import { id } from '@constellar/core'
import { program } from 'commander'

import { Category } from './category'
import { getConfig } from './config'
import { reset } from './db'
import { getFile } from './files/scan'
import { addTag, delTag, getTags, listTags } from './files/tags'

program.command('dump').action(async () => {
	await Category.dump()
})

program.command('scan <filename>').action(async (filename) => {
	console.log(await getFile(filename, id))
})

program.command('config').action(async () => {
	console.log(await getConfig())
})

program.command('addTag <tag> <filename>').action(async (tag, filename) => {
	console.log(await addTag(tag, filename))
})

program.command('delTag <tag> <filename>').action(async (tag, filename) => {
	console.log(await delTag(tag, filename))
})

program.command('getTags <filename>').action(async (filename) => {
	console.log(await getTags(filename))
})

program.command('getFiles <tag>').action(async () => {
	console.log(await listTags())
})

program.command('listTags').action(async () => {
	console.log(await listTags())
})

program.command('reset').action(async () => {
	await reset()
})

program.parseAsync(process.argv)
