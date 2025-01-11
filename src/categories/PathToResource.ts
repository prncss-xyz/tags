import { id } from '@constellar/core'

import { CategoryWithPut } from '../category'
import { oneToOne } from '../relations'
import { Resources } from './Resource'

export const PathToResource = new CategoryWithPut<string, string>('PathToResource')

const Self = PathToResource

oneToOne(Resources, (resource) => resource.filePath, Self, id)
