import { id } from '@constellar/core'
import { program } from 'commander'

import { Category } from './category'
import { exportData, importData } from './commands/export'
import { getFile } from './commands/scan'
import { addTag, delTag, getTags, listResourcesByTag, listTags } from './commands/tags'
import { getConfig } from './config'
import { reset } from './db'
import { log } from './log'

// TODO: tag-rm tag-mv export import

program.command('dump').action(async () => {
	log.log(await Category.dump())
})

program.command('scan <filename>').action(async (filename) => {
	await getFile(filename, id)
})

program.command('config').action(async () => {
	log.log(await getConfig())
})

program.command('tag-add <tag> <filename>').action(async (tag, filename) => {
	await addTag(tag, filename)
})

program.command('tag-rm <tag> <filename>').action(async (tag, filename) => {
	await delTag(tag, filename)
})

program.command('tag-get <filename>').action(async (filename) => {
	await getTags(filename)
})

program.command('file-ls <tag>').action(async (tag) => {
	await listResourcesByTag(tag)
})

program.command('tag-ls').action(async () => {
	await listTags()
})

program.command('reset').action(async () => {
	await reset()
})

program.command('export').action(async () => {
	await exportData()
})

program.command('import <dir>').action(async (dir) => {
	await importData(dir)
})

program.parseAsync(process.argv)
