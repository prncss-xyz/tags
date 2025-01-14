import { program } from 'commander'

import { Category } from './category'
import { exportData, importData } from './commands/export'
import { scanFile } from './commands/scan'
import { scanDirs } from './commands/scanDirs'
import {
	listAllTags,
	listResourcesByTag,
	tagAdd,
	tagAddList,
	tagDel,
	tagGet,
} from './commands/tags'
import { getConfig } from './config'
import { reset } from './db'
import { logger } from './logger'

// TODO: tag-rm tag-mv scan

program.command('dump').action(async () => {
	logger.log(await Category.dump())
})

program.command('scan').action(async () => {
	await scanDirs()
})

program.command('scan-file <filename>').action(async (filename) => {
	await scanFile(filename)
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

program.command('ls-tag').action(async () => {
	await listAllTags()
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
