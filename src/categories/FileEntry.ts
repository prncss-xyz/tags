import { focus, prop } from '@constellar/core'

import { CategoryWithPut } from '../category'

export type IFileEntry = {
	mtime: number
	resource: string
}

export const FileEntry = new CategoryWithPut<string, IFileEntry>('FilePath')

export const fMTime = focus<IFileEntry>()(prop('mtime'))
export const fResource = focus<IFileEntry>()(prop('resource'))
