/* eslint-disable @typescript-eslint/no-explicit-any */
import { COptic, id, IOptic, isNever, NON_PRISM } from '@constellar/core'

export function asserted<Part>() {
	return function <Whole, Command, Fail, S>(o: IOptic<Part, Whole, Fail, Command, S>) {
		if (!(o.getter && o.setter)) throw new Error('asserted does not work with traversals')
		const getter = (whole: Whole) => {
			const part = o.getter!(whole)
			if (o.isFailure(part)) throw new Error(`unexpected value: ${part}`)
			return part
		}
		return new COptic<Part, Whole, never, Command, S>({
			com: o.com,
			getter,
			isCommand: o.isCommand,
			isFailure: isNever,
			mapper: makeMapper(o.setter, getter),
			refold: (foldPart) => {
				const lastFold = o.refold(foldPart)
				return (whole, acc, ctx) =>
					o.isFailure(o.getter!(whole))
						? foldPart(getter(whole), acc, ctx)
						: lastFold(whole, acc, ctx)
			},
			setter: o.setter,
		})
	}
}

function makeMapper<Part, Whole>(
	setter: Setter<Part, Whole, NON_PRISM>,
	getter: Getter<Part, Whole, never>,
): (mod: (p: Part) => Part, w: Whole) => Whole {
	if (setter === id && getter === id) return id as any
	if (setter === id) return (f, w) => f(getter(w)) as any
	if (getter === id) return (f, w) => setter(f(w as any), w) as any
	return (mod: (v: Part) => Part, w: Whole) => {
		return setter(mod(getter(w)), w)
	}
}

type Getter<Part, Whole, Fail> = (w: Whole) => Fail | Part
type Setter<Part, Whole, S> = (p: Part, w: S | Whole) => Whole
