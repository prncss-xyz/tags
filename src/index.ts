import { program } from '@commander-js/extra-typings'

import { sync } from './categories/Persistance'
import { scanDirs } from './categories/scanDirs'
import { scanFileSafe } from './categories/scanFile'
import { Category } from './category'
import { dupes } from './commands/dupes'
import { exportData, importData } from './commands/export'
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

// TODO: tag-rm tag-mv

program.command('dupes').action(async () => {
	await dupes()
})

program.command('dump').action(async () => {
	await Category.dump()
})

program.command('watch').action(async () => {
	await scanDirs(true)
})

program.command('scan').action(async () => {
	await scanDirs()
})

program.command('sync').action(async () => {
	await sync()
})

program.command('scan-file <filename>').action(async (filename) => {
	await scanFileSafe(filename)
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

program.command('tag-ls [tag]').action(async (tag) => {
	if (tag === undefined) return await listAllTags()
	await listResourcesByTag(tag)
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
