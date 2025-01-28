export function accumulator<T>(init: T) {
	let acc = init
	return [
		function (mod: (xs: T) => T) {
			acc = mod(acc)
		},
		function () {
			return acc
		},
	] as const
}
