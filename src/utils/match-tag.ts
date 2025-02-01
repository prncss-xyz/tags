import { minimatch } from 'minimatch'

export function matchTag(positive: string | undefined, negative: string | undefined) {
	return function (tag: string) {
		if (!tag) return false
		if (negative && negative !== positive && minimatch(tag, negative)) return false
		if (!positive) return true
		return minimatch(tag, positive)
	}
}
