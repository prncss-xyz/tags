import { extname } from 'node:path'

const text = ['.md']

export function shouldAnalyze(path: string) {
	const ext = extname(path)
	return text.includes(ext)
}

export async function analyze(filePath: string): Promise<Meta | undefined> {
	return { type: 'text' }
}

export type Meta = { type: 'text' }
