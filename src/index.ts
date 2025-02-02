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
	listUntagged,
	tagAdd,
	tagAddList,
	tagDel,
	tagGet,
	tagMv,
} from './commands/tags'
import { getConfig } from './config'
import { reset } from './db'
import { logger } from './logger'

program.command('dupes').action(async () => {
	await dupes()
})

program.command('dump').action(async () => {
	await Category.dump()
})

program
	.command('scan')
	.option('-w, --watch')
	.option('-f, --force')
	.action(async ({ force, watch }) => {
		await scanDirs(watch, force)
	})

program.command('sync').action(async () => {
	await sync()
})

program
	.command('scan-file')
	.option('-f, --force')
	.argument('<filename>')
	.action(async (filename, { force }) => {
		await scanFileSafe(filename, force)
	})

program.command('config').action(async () => {
	logger.log(await getConfig())
})

program
	.command('tag-add')
	.argument('<tag>')
	.argument('<filename...>')
	.action(async (tag, filenames) => {
		await tagAdd(tag, filenames)
	})

program
	.command('tag-add-list')
	.argument('<tag>')
	.argument('<filename...>')
	.action(async (tag, filenames) => {
		await tagAddList(tag, filenames)
	})

program
	.command('tag-rm')
	.argument('<tag>')
	.argument('<filename...>')
	.action(async (tag, filenames) => {
		await tagDel(tag, filenames)
	})

program
	.command('tag-get')
	.argument('<filename>')
	.action(async (filename) => {
		await tagGet(filename)
	})

program
	.command('tag-ls')
	.argument('[tag]')
	.option('-n, --negative <negative>')
	.option('-s', '--shuffle')
	.action(async (tag, { negative, s }) => {
		await listResourcesByTag(tag, negative, s)
	})

program
	.command('tag-un')
	.option('-s', '--shuffle')
	.action(async ({ s }) => {
		await listUntagged(s)
	})

program.command('tag-all').action(async () => {
	await listAllTags()
})

program
	.command('tag-mv')
	.description(
		"rename a tag; to merge tags move one tag to the other tag's name; to delete a tag move to empty string",
	)
	.argument('<source>')
	.argument('<target>')
	.action(async (source, target) => {
		await tagMv(source, target)
	})

program.command('reset').action(async () => {
	await reset()
})

program.command('export').action(async () => {
	await exportData()
})

program
	.command('import')
	.argument('<dir>')
	.action(async (dir) => {
		await importData(dir)
	})

program.parseAsync(process.argv)
