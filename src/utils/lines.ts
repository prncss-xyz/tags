import { createReadStream } from 'fs'
import { createInterface } from 'readline'

export function lines(filePath: string) {
	return createInterface({
		crlfDelay: Infinity,
		input: createReadStream(filePath),
	})
}
