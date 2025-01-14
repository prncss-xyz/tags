import { id } from '@constellar/core'
import { program } from 'commander'

import { Category } from './category'
import { exportData, importData } from './commands/export'
import { getFile } from './commands/scan'
import { tagAdd, tagAddList, tagDel, tagGet, listResourcesByTag, listTags } from './commands/tags'
import { getConfig } from './config'
import { reset } from './db'
import { logger } from './logger'

// TODO: tag-rm tag-mv scan

program.command('dump').action(async () => {
	logger.log(await Category.dump())
})

program.command('scan <filename>').action(async (filename) => {
	await getFile(filename, id)
})

program.command('config').action(async () => {
	logger.log(await getConfig())
})

program.command('tag-add <tag> <filename...>').action(async (tag, filenames) => {
	await tagAdd(tag, filenames)
})

program.command('tag-add-list <tag> <filename...>').action(async (tag, filenames) => {
	await tagAddList(tag, filenames)
})

program.command('tag-rm <tag> <filename...>').action(async (tag, filenames) => {
	await tagDel(tag, filenames)
})

program.command('tag-get <filename>').action(async (filename) => {
	await tagGet(filename)
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
