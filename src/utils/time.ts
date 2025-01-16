export function getDebounced<T>(cb: (arg: T) => void, delay?: number) {
	let handle: NodeJS.Timeout | number | string | undefined
	let arg_: T
	function eff() {
		cb(arg_)
	}
	return function (arg: T) {
		clearTimeout(handle)
		arg_ = arg
		handle = setTimeout(eff, delay)
	}
}

export function getDebouncedDeduped<T>(cb: (arg: T) => void, delay?: number) {
	let handle: NodeJS.Timeout | number | string | undefined
	let first = true
	let arg_: T
	function eff() {
		cb(arg_)
		first = true
	}
	return function (arg: T) {
		clearTimeout(handle)
		if (first) first = false
		else if (arg_ !== arg) cb(arg_)
		arg_ = arg
		handle = setTimeout(eff, delay)
	}
}
