import { id } from '@constellar/core'

import { CategoryWithPut } from '../category'
import { oneToOne } from '../relations'
import { Resources } from './Resource'

export const ChecksumToResource = new CategoryWithPut<string, string>('ChecksumToResource')

const Self = ChecksumToResource

oneToOne(Resources, (resource) => resource.checksum, Self, id)
