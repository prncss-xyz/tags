export const logger = console

export function logged<X>(x: X) {
	console.log(x)
	return x
}
