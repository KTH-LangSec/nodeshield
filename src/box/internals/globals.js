/** @typedef {import("../names.js").NameGenerator} NameGenerator */

/**
 * @typedef Options
 * @property {NameGenerator} names
 * @property {boolean} esm
 */

const kAllGlobals = Symbol.for("GlobalThis");
const kSafeGlobals = Symbol.for("SafeGlobals");
const kAppGlobals = Symbol.for("SubjectGlobals");
const kPrimordials = Symbol.for("Primordials");

const kArrayFrom = Symbol.for("ArrayFrom");
const kArrayPrototypeForEach = Symbol.for("ArrayPrototypeForEach");
const kArrayPrototypeIncludes = Symbol.for("ArrayPrototypeIncludes");
const kArrayPrototypeSome = Symbol.for("ArrayPrototypeSome");
const kConsoleLog = Symbol.for("ConsoleLog");
const kError = Symbol.for("Error");
const kObjectAssign = Symbol.for("ObjectAssign");
const kObjectCreate = Symbol.for("ObjectCreate");
const kObjectDefineProperty = Symbol.for("ObjectDefineProperty");
const kObjectEntries = Symbol.for("ObjectEntries");
const kObjectFreeze = Symbol.for("ObjectFreeze");
const kObjectGetOwnPropertyDescriptor = Symbol.for(
	"ObjectGetOwnPropertyDescriptor",
);
const kObjectHasOwn = Symbol.for("ObjectHasOwn");
const kObjectKeys = Symbol.for("ObjectKeys");
const kProcessExit = Symbol.for("ProcessExit");
const kProxy = Symbol.for("Proxy");
const kReferenceError = Symbol.for("ReferenceError");

const kReflectApply = Symbol.for("ReflectApply");
const kReflectConstruct = Symbol.for("ReflectConstruct");
const kReflectDefineProperty = Symbol.for("ReflectDefineProperty");
const kReflectDeleteProperty = Symbol.for("ReflectDeleteProperty");
const kReflectGet = Symbol.for("ReflectGet");
const kReflectGetOwnPropertyDescriptor = Symbol.for(
	"ReflectGetOwnPropertyDescriptor",
);
const kReflectGetPrototypeOf = Symbol.for("ReflectGetPrototypeOf");
const kReflectHas = Symbol.for("ReflectHas");
const kReflectIsExtensible = Symbol.for("ReflectIsExtensible");
const kReflectOwnKeys = Symbol.for("ReflectOwnKeys");
const kReflectPreventExtensions = Symbol.for("ReflectPreventExtensions");
const kReflectSet = Symbol.for("ReflectSet");
const kReflectSetPrototypeOf = Symbol.for("ReflectSetPrototypeOf");

const kSet = Symbol.for("Set");

const kStringPrototypeStartsWith = Symbol.for("StringPrototypeStartsWith");
const kStringPrototypeIncludes = Symbol.for("StringPrototypeIncludes");
const kStringPrototypeTrim = Symbol.for("StringPrototypeTrim");

const kSymbol = Symbol.for("Symbol");

/**
 * @param {Options} options
 * @returns {string}
 */
export function globalsProxy({ names: name, esm }) {
	return `
/// Create a locally scoped immutable copy of globalThis.
const ${name.for(kAllGlobals)} = Reflect.ownKeys(globalThis)
	.filter((key) => key !== "globalThis" && key !== "global")
	.reduce(
		(result, key) => Object.defineProperty(
			result,
			key,
			{
				configurable: false,
				enumerable: true,
				value: globalThis[key],
				writable: false,
			},
		),
		Object.create(null),
	);

const sensitive = [
	"Reflect",

	/// capability: code
	"eval",
	"Function",
	// "WebAssembly", - we can't delete it because it breaks teardown sometimes, but it's not capability bearing in the host

	/// capability: crypto
	"Crypto",
	"crypto",
	"CryptoKey",
	"SubtleCrypto",

	/// capability: network
	"fetch",

	/// capability: system
	"process",
];

/// Delete sensitive globals from globalThis to make everything unavailable. We
/// don't remove the other globals because this breaks various node internals.
for (const key of sensitive) {
	delete globalThis[key];
}


/// Create a (second) incomplete locally scoped copy of globalThis. This one will
/// only have keys that are generally considered safe and not related to any
/// capability. This approach simplifies passing globals to new contexts.
const ${name.for(kSafeGlobals)} = ${name.for(kAllGlobals)}.Object.assign(
	${name.for(kAllGlobals)}.Object.create(null),
	${name.for(kAllGlobals)},
);
for (const key of sensitive) {
	delete ${name.for(kSafeGlobals)}[key];
}

/// Create globals object for application specific globals.
///
/// The name of this object does not need to be randomized because this is
/// intended to be available to all code anyway.
const ${name.for(kAppGlobals)} = ${name.for(kAllGlobals)}.Object.create(null);


/// Create a primordials object based on original references to utility functions
/// used for sandboxing to avoid it's behavior being changed by these being overridden.
const ${name.for(kArrayFrom)} = ${name.for(kAllGlobals)}.Array.from;
const ${name.for(kArrayPrototypeForEach)} = ${name.for(kAllGlobals)}.Function.prototype.call.bind(${name.for(kAllGlobals)}.Array.prototype.forEach);
const ${name.for(kArrayPrototypeIncludes)} = ${name.for(kAllGlobals)}.Function.prototype.call.bind(${name.for(kAllGlobals)}.Array.prototype.includes);
const ${name.for(kArrayPrototypeSome)} = ${name.for(kAllGlobals)}.Function.prototype.call.bind(${name.for(kAllGlobals)}.Array.prototype.some);
const ${name.for(kConsoleLog)} = ${name.for(kAllGlobals)}.console.log;
const ${name.for(kError)} = ${name.for(kAllGlobals)}.Error;
const ${name.for(kObjectAssign)} = ${name.for(kAllGlobals)}.Object.assign;
const ${name.for(kObjectCreate)} = ${name.for(kAllGlobals)}.Object.create;
const ${name.for(kObjectDefineProperty)} = ${name.for(kAllGlobals)}.Object.defineProperty;
const ${name.for(kObjectEntries)} = ${name.for(kAllGlobals)}.Object.entries;
const ${name.for(kObjectFreeze)} = ${name.for(kAllGlobals)}.Object.freeze;
const ${name.for(kObjectGetOwnPropertyDescriptor)} = ${name.for(kAllGlobals)}.Object.getOwnPropertyDescriptor;
const ${name.for(kObjectHasOwn)} = ${name.for(kAllGlobals)}.Object.hasOwn;
const ${name.for(kObjectKeys)} = ${name.for(kAllGlobals)}.Object.keys;
const ${name.for(kProcessExit)} = ${name.for(kAllGlobals)}.process.exit;
const ${name.for(kProxy)} = ${name.for(kAllGlobals)}.Proxy;
const ${name.for(kReferenceError)} = ${name.for(kAllGlobals)}.ReferenceError;
const ${name.for(kReflectApply)} = ${name.for(kAllGlobals)}.Reflect.apply;
const ${name.for(kReflectConstruct)} = ${name.for(kAllGlobals)}.Reflect.construct;
const ${name.for(kReflectDefineProperty)} = ${name.for(kAllGlobals)}.Reflect.defineProperty;
const ${name.for(kReflectDeleteProperty)} = ${name.for(kAllGlobals)}.Reflect.deleteProperty;
const ${name.for(kReflectGet)} = ${name.for(kAllGlobals)}.Reflect.get;
const ${name.for(kReflectGetOwnPropertyDescriptor)} = ${name.for(kAllGlobals)}.Reflect.getOwnPropertyDescriptor;
const ${name.for(kReflectGetPrototypeOf)} = ${name.for(kAllGlobals)}.Reflect.getPrototypeOf;
const ${name.for(kReflectHas)} = ${name.for(kAllGlobals)}.Reflect.has;
const ${name.for(kReflectIsExtensible)} = ${name.for(kAllGlobals)}.Reflect.isExtensible;
const ${name.for(kReflectOwnKeys)} = ${name.for(kAllGlobals)}.Reflect.ownKeys;
const ${name.for(kReflectPreventExtensions)} = ${name.for(kAllGlobals)}.Reflect.preventExtensions;
const ${name.for(kReflectSet)} = ${name.for(kAllGlobals)}.Reflect.set;
const ${name.for(kReflectSetPrototypeOf)} = ${name.for(kAllGlobals)}.Reflect.setPrototypeOf;
const ${name.for(kSet)} = ${name.for(kAllGlobals)}.Set;
const ${name.for(kStringPrototypeStartsWith)} = ${name.for(kAllGlobals)}.Function.prototype.call.bind(${name.for(kAllGlobals)}.String.prototype.startsWith);
const ${name.for(kStringPrototypeIncludes)} = ${name.for(kAllGlobals)}.Function.prototype.call.bind(${name.for(kAllGlobals)}.String.prototype.includes);
const ${name.for(kStringPrototypeTrim)} = ${name.for(kAllGlobals)}.Function.prototype.call.bind(${name.for(kAllGlobals)}.String.prototype.trim);
const ${name.for(kSymbol)} = ${name.for(kAllGlobals)}.Symbol;

const ${name.for(kPrimordials)} = ${name.for(kAllGlobals)}.Object.freeze(
	${name.for(kAllGlobals)}.Object.assign(
		${name.for(kAllGlobals)}.Object.create(null),
		{
			ArrayFrom(iterable) {
				return ${name.for(kArrayFrom)}(iterable);
			},
			ArrayForEach(array, callback) {
				${name.for(kArrayPrototypeForEach)}(array, callback);
			},
			ArrayIncludes(array, query) {
				return ${name.for(kArrayPrototypeIncludes)}(array, query);
			},
			ArraySome(array, callbackFn) {
				return ${name.for(kArrayPrototypeSome)}(array, callbackFn);
			},
			ConsoleLog(message) {
				return ${name.for(kConsoleLog)}(message);
			},
			NewError(message) {
				return new ${name.for(kError)}(message);
			},
			NewProxy(target, handler) {
				return new ${name.for(kProxy)}(target, handler);
			},
			NewReferenceError(message) {
				return new ${name.for(kReferenceError)}(message);
			},
			NewSet(iterable) {
				return new ${name.for(kSet)}(iterable);
			},
			NewSymbol(description) {
				return ${name.for(kSymbol)}(description);
			},
			ObjectAssign(target, ...sources) {
				return ${name.for(kObjectAssign)}(target, ...sources);
			},
			ObjectCreate(object) {
				return ${name.for(kObjectCreate)}(object);
			},
			ObjectFreeze(object) {
				return ${name.for(kObjectFreeze)}(object);
			},
			ObjectDefineProperty(object, property, descriptor) {
				return ${name.for(kObjectDefineProperty)}(object, property, descriptor);
			},
			ObjectEntries(prototype, propertiesObject) {
				return ${name.for(kObjectEntries)}(prototype, propertiesObject);
			},
			ObjectHasOwn(object, property) {
				return ${name.for(kObjectHasOwn)}(object, property);
			},
			ObjectGetOwnPropertyDescriptor(object, property) {
				return ${name.for(kObjectGetOwnPropertyDescriptor)}(object, property);
			},
			ObjectKeys(object) {
				return ${name.for(kObjectKeys)}(object);
			},
			ProcessExit(code) {
				return ${name.for(kProcessExit)}(code);
			},
			ReflectApply(target, thisArgument, argumentsList) {
				return ${name.for(kReflectApply)}(target, thisArgument, argumentsList);
			},
			ReflectConstruct(target, argumentsList, newTarget) {
				return ${name.for(kReflectConstruct)}(target, argumentsList, newTarget);
			},
			ReflectDefineProperty(target, property, attributes) {
				return ${name.for(kReflectDefineProperty)}(target, property, attributes);
			},
			ReflectDeleteProperty(target, property) {
				return ${name.for(kReflectDeleteProperty)}(target, property);
			},
			ReflectGet(target, property, receiver) {
				return ${name.for(kReflectGet)}(target, property, receiver);
			},
			ReflectGetOwnPropertyDescriptor(target, property) {
				return ${name.for(kReflectGetOwnPropertyDescriptor)}(target, property);
			},
			ReflectGetPrototypeOf(target) {
				return ${name.for(kReflectGetPrototypeOf)}(target);
			},
			ReflectHas(target, property) {
				return ${name.for(kReflectHas)}(target, property);
			},
			ReflectIsExtensible(target) {
				return ${name.for(kReflectIsExtensible)}(target);
			},
			ReflectOwnKeys(target) {
				return ${name.for(kReflectOwnKeys)}(target);
			},
			ReflectPreventExtensions(target) {
				return ${name.for(kReflectPreventExtensions)}(target);
			},
			ReflectSet(target, property, value, _receiver) {
				return ${name.for(kReflectSet)}(target, property, value);
			},
			ReflectSetPrototypeOf(target, prototype) {
				return ${name.for(kReflectSetPrototypeOf)}(target, prototype);
			},
			StringStartsWith(string, start) {
				return ${name.for(kStringPrototypeStartsWith)}(\`\${string}\`, start);
			},
			StringIncludes(string, sub) {
				return ${name.for(kStringPrototypeIncludes)}(\`\${string}\`, sub);
			},
			StringTrim(string, sub) {
				return ${name.for(kStringPrototypeTrim)}(\`\${string}\`);
			},
		},
	),
);

/// Export the set of all globals, the set of safe globals, and the set of app globals.
${
	esm
		? `export const all = ${name.for(kAllGlobals)}, app = ${name.for(kAppGlobals)}, primordials = ${name.for(kPrimordials)}, safe = ${name.for(kSafeGlobals)}, none = ${name.for(kAllGlobals)}.Symbol.for();`
		: `module.exports = ${name.for(kAllGlobals)}.Object.freeze({ all: ${name.for(kAllGlobals)}, app: ${name.for(kAppGlobals)}, primordials: ${name.for(kPrimordials)}, safe: ${name.for(kSafeGlobals)}, none: ${name.for(kAllGlobals)}.Symbol.for() })`
};
`;
}
