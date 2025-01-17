import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'

import { CategoryKey } from '../../category'

export function calculateChecksum(filePath: string): Promise<CategoryKey<'Resources'>> {
	return new Promise((resolve, reject) => {
		const hash = createHash('md5')

		const stream = createReadStream(filePath)

		stream.on('error', (err) => {
			reject(err)
		})

		stream.on('data', (chunk) => {
			hash.update(chunk)
		})

		stream.on('end', () => {
			const checksum = hash.digest('base64')
			resolve(checksum as CategoryKey<'Resources'>)
		})
	})
}
