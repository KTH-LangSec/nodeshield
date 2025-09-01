import { STRATEGIES } from "../../../policy.js";
import { kAllGlobals, kPrimordials } from "../names.js";
import { handleViolation } from "../violation.js";

export function createMembrane({ id, name, strategy, isAllowed, what, stub }) {
	if (isAllowed) {
		return `return ${name.for(kAllGlobals)}.${what}`;
	}

	const trap = handleViolation({ name, strategy, what, who: id });
	const target = determineTarget({ name, strategy, stub, what });

	return `
return ${name.for(kPrimordials)}.NewProxy(
	${target},
	${name.for(kPrimordials)}.ObjectFreeze(
		${name.for(kPrimordials)}.ObjectAssign(
			${name.for(kPrimordials)}.ObjectCreate(null),
			{
				apply(target, thisArg, argumentsList) {
					${trap}

					/// If allowed, operate as usual.
					return ${name.for(kPrimordials)}.ReflectApply(target, thisArg, argumentsList);
				},
				construct(target, argumentsList, newTarget) {
					${trap}

					/// If allowed, operate as usual.
					return ${name.for(kPrimordials)}.ReflectConstruct(target, argumentsList, newTarget);
				},
				defineProperty(target, property, descriptor) {
					${trap}

					/// If allowed, operate as usual.
					return ${name.for(kPrimordials)}.ReflectDefineProperty(target, property, descriptor);
				},
				deleteProperty(target, property) {
					${trap}

					/// If allowed, operate as usual.
					return ${name.for(kPrimordials)}.ReflectDeleteProperty(target, property);
				},
				get(target, property, receiver) {
					${trap}

					/// If allowed, operate as usual.
					return ${name.for(kPrimordials)}.ReflectGet(target, property, receiver);
				},
				getOwnPropertyDescriptor(target, property) {
					${trap}

					/// If allowed, operate as usual.
					return ${name.for(kPrimordials)}.ReflectGetOwnPropertyDescriptor(target, property);
				},
				getPrototypeOf(target) {
					${trap}

					/// If allowed, operate as usual.
					return ${name.for(kPrimordials)}.ReflectGetPrototypeOf(target);
				},
				has(target, property) {
					${trap}

					/// If allowed, operate as usual.
					return ${name.for(kPrimordials)}.ReflectHas(target, property);
				},
				isExtensible(target) {
					${trap}

					/// If allowed, operate as usual.
					return ${name.for(kPrimordials)}.ReflectIsExtensible(target);
				},
				ownKeys(target) {
					${trap}

					/// If allowed, operate as usual.
					return ${name.for(kPrimordials)}.ReflectOwnKeys(target);
				},
				preventExtensions(target) {
					${trap}

					/// If allowed, operate as usual.
					return ${name.for(kPrimordials)}.ReflectPreventExtensions(target);
				},
				set(target, property, value, receiver) {
					${trap}

					/// If allowed, operate as usual.
					return ${name.for(kPrimordials)}.ReflectSet(target, property, value, receiver);
				},
				setPrototypeOf(target, prototype) {
					${trap}

					/// If allowed, operate as usual.
					return ${name.for(kPrimordials)}.ReflectSetPrototypeOf(target, prototype);
				},
			},
		),
	),
);
`;
}

function determineTarget({ name, strategy, stub, what }) {
	switch (strategy) {
		case STRATEGIES.log:
			return `${name.for(kAllGlobals)}.${what}`;
		case STRATEGIES.throw:
		case STRATEGIES.exit:
			return stub;
		default:
			throw new Error(`Unknown strategy ${strategy}`);
	}
}
