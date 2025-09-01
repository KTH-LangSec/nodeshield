import { STRATEGIES } from "../../../policy.js";
import { handleViolation } from "../violation.js";
import { kAllGlobals, kPrimordials, kGuestRequire } from "../names.js";

export function generateProcessGlobal({
	id,
	name,
	permissions,
	strategy,
	cjs,
}) {
	/// NOTE: process should be a membrane regardless of whether the guest code is
	/// allowed to use it or not because if it is we still need to wrap the
	/// `mainModule.require` and `binding` functions.

	let trap = "";
	if (!permissions.process) {
		trap = handleViolation({ name, strategy, what: "process", who: id });
	}

	let target = "";
	if (permissions.process) {
		target = `${name.for(kAllGlobals)}.process`;
	} else {
		switch (strategy) {
			case STRATEGIES.log:
				target = `${name.for(kAllGlobals)}.process`;
				break;
			case STRATEGIES.throw:
			case STRATEGIES.exit:
				target = `{}`;
				break;
			default:
				throw new Error(`Unknown strategy ${strategy}`);
		}
	}

	const binding = generateBindingAccess({
		id,
		name,
		permissions,
		strategy,
	});
	const mainModule = generateMainModuleRequireAccess({ name, cjs });

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

					${mainModule}
					${binding}

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

function generateMainModuleRequireAccess({ name, cjs }) {
	if (!cjs) {
		return "";
	}

	return `
/// Handle the 'mainModule' property separately so that access to its
/// 'require' function can be handled.
if (property === "mainModule") {
	return ${name.for(kPrimordials)}.NewProxy(
		target.mainModule,
		${name.for(kPrimordials)}.ObjectFreeze(
			${name.for(kPrimordials)}.ObjectAssign(
				${name.for(kPrimordials)}.ObjectCreate(null),
				{
					get(target, property, _receiver) {
						/// Handle 'require' so that this modules import functionality can
						/// be enforced.
						if (property === "require") {
							return ${name.for(kGuestRequire)};
						}

						return ${name.for(kPrimordials)}.ReflectGet(target, property, receiver);
					},
				},
			),
		),
	);
}
`;
}

function generateBindingAccess({ id, name, permissions, strategy }) {
	return `
/// Handle the 'binding' property separately so that we can handle direct access
/// to bindings in accordance with capabilities.
if (property === "binding") {
	return ${name.for(kPrimordials)}.NewProxy(
		target.binding,
		${name.for(kPrimordials)}.ObjectFreeze(
			${name.for(kPrimordials)}.ObjectAssign(
				${name.for(kPrimordials)}.ObjectCreate(null),
				{
					apply(target, thisArgument, argumentsList) {
						const specifier = argumentsList[0];
						if (${name.for(kPrimordials)}.ArrayIncludes(["v8"], specifier)) {
							/// Capability: code
							allowed = ${permissions.code ? true : false};
						} else if (${name.for(kPrimordials)}.ArrayIncludes(["spawn_sync", "spawn"], specifier)) {
							/// Capability: command
							allowed = ${permissions.command ? true : false};
						} else if (${name.for(kPrimordials)}.ArrayIncludes(["crypto"], specifier)) {
							/// Capability: crypto
							allowed = ${permissions.crypto ? true : false};
						// } else if (${name.for(kPrimordials)}.ArrayIncludes([], specifier)) {
						// 	/// Capability: file-system
						// 	allowed = ${permissions.fs ? true : false};
						// } else if (${name.for(kPrimordials)}.ArrayIncludes([], specifier)) {
						// 	/// Capability: network
						// 	allowed = ${permissions.network ? true : false};
						// } else if (${name.for(kPrimordials)}.ArrayIncludes([], specifier)) {
						// 	/// Capability: system
						// 	allowed = ${permissions.system ? true : false};
						} else {
							/// Default: everything else is allowed
							allowed = true;
						}

						/// If access is not allowed, handle it in accordance with the
						/// selected strategy.
						if (!allowed) {
							${handleViolation({ name, strategy, what: "${specifier}", who: id })}
						}

						return ${name.for(kPrimordials)}.ReflectApply(target, thisArgument, argumentsList);
					},
				},
			),
		),
	);
}
`;
}
