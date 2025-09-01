import * as assert from "node:assert";
import { test } from "node:test";
import * as vm from "node:vm";

const sandboxes = new Map([
	[
		"vm.runInContext with vm.createContext context",
		function ({ script, context = {}, options = {} }) {
			const _context = {
				// Copy the context because `vm.createContext` operates in place
				...context,
			};

			vm.createContext(_context, {
				codeGeneration: {
					strings: options?.contextCodeGeneration?.strings,
					wasm: options?.contextCodeGeneration?.wasm,
				},
			});

			return vm.runInContext(script, _context);
		},
	],
	[
		"vm.runInNewContext with null-prototype context",
		function ({ script, context = {}, options = {} }) {
			const _context = Object.assign(Object.create(null), context);

			return vm.runInNewContext(script, _context, options);
		},
	],
]);

test("globals", async (t) => {
	for (const [name, run] of sandboxes.entries()) {
		await t.test(name, async (t) => {
			await t.test("JavaScript globals", async (t) => {
				// NOTE: Iterator and Generator types are not globally accessible. i.e.:
				//       AsyncIterator, AsyncFunction, AsyncGenerator, AsyncGeneratorFunction,
				//       Generator, GeneratorFunction, Iterator

				const globals = [
					"AggregateError",
					"Array",
					"Atomics",
					"BigInt",
					"BigInt64Array",
					"BigUint64Array",
					"Boolean",
					"DataView",
					"Date",
					"decodeURI",
					"decodeURIComponent",
					"Error",
					"EvalError",
					"encodeURI",
					"encodeURIComponent",
					"eval",
					"FinalizationRegistry",
					"Float32Array",
					"Float64Array",
					"Function",
					"Infinity",
					"Int8Array",
					"Int16Array",
					"Int32Array",
					"Intl",
					"isFinite",
					"isNaN",
					"JSON",
					"Map",
					"Math",
					"NaN",
					"Number",
					"Object",
					"Promise",
					"Proxy",
					"parseFloat",
					"parseInt",
					"ReferenceError",
					"RangeError",
					"Reflect",
					"RegExp",
					"Set",
					"SharedArrayBuffer",
					"String",
					"Symbol",
					"SyntaxError",
					"TypeError",
					"URIError",
					"Uint8Array",
					"Uint8ClampedArray",
					"Uint16Array",
					"Uint32Array",
					"undefined",
					"WeakMap",
					"WeakRef",
					"WeakSet",
				];

				for (const global of globals) {
					await t.test(`can access ${global}`, () => {
						assert.doesNotThrow(() => run({ script: global, context: {} }));
					});
				}
			});

			await t.test("Node.js globals", async (t) => {
				const globals = [
					"AbortController",
					"Blob",
					"Buffer",
					"ByteLengthQueuingStrategy",
					"atob",
					"BroadcastChannel",
					"btoa",
					"clearImmediate",
					"clearInterval",
					"clearTimeout",
					"CompressionStream",
					"CountQueuingStrategy",
					"Crypto",
					"crypto",
					"CryptoKey",
					"CustomEvent",
					"DecompressionStream",
					"Event",
					"EventTarget",
					"fetch",
					"File",
					"FormData",
					"global",
					"Headers",
					"MessageChannel",
					"MessageEvent",
					"MessagePort",
					"Navigator",
					"navigator",
					"PerformanceEntry",
					"PerformanceMark",
					"PerformanceMeasure",
					"PerformanceObserver",
					"PerformanceObserverEntryList",
					"PerformanceObserverTiming",
					"performance",
					"process",
					"queueMicrotask",
					"ReadableByteStreamController",
					"ReadableStream",
					"ReadableStreamBYOBReader",
					"ReadableStreamBYOBRequest",
					"ReadableStreamDefaultController",
					"ReadableStreamDefaultReader",
					"Response",
					"Request",
					"setImmediate",
					"setInterval",
					"setTimeout",
					"structuredClone",
					"SubtleCrypto",
					"DOMException",
					"TextDecoder",
					"TextDecoderStream",
					"TextEncoder",
					"TextEncoderStream",
					"TransformStream",
					"TransformStreamDefaultController",
					"URL",
					"URLSearchParams",
					"WebSocket",
					"WritableStream",
					"WritableStreamDefaultController",
					"WritableStreamDefaultWriter",
				];

				for (const global of globals) {
					await t.test(`cannot access ${global}`, () => {
						assert.throws(() => run({ script: global, context: {} }), {
							name: "ReferenceError",
							message: `${global} is not defined`,
						});
					});
				}

				await t.test("can access console", () => {
					assert.doesNotThrow(() => run({ script: "console", context: {} }));
				});

				await t.test("can access WebAssembly", () => {
					assert.doesNotThrow(() =>
						run({ script: "WebAssembly", context: {} }),
					);
				});

				await t.test("can override console", () => {
					const got = run({ script: "console", context: { console: null } });
					const want = undefined;
					assert.equal(got, want);
				});

				await t.test("can override WebAssembly", () => {
					const got = run({
						script: "WebAssembly",
						context: { WebAssembly: null },
					});
					const want = undefined;
					assert.equal(got, want);
				});
			});
		});
	}
});

test("dynamic JavaScript code evaluation", async (t) => {
	const allowEval = { contextCodeGeneration: { strings: true } };
	const allowWasm = { contextCodeGeneration: { wasm: true } };
	const disallowEval = { contextCodeGeneration: { strings: false } };
	const disallowWasm = { contextCodeGeneration: { wasm: false } };

	const value = "foobar";
	const scriptEval = `eval("'${value}'")`;
	const scriptNewFunction = `(new Function("return '${value}'"))()`;
	const scriptGlobalthisConstructor = `globalThis.__proto__.constructor.constructor("return '${value}'")()`;
	const scriptObjectConstructor = `Object.prototype.constructor.constructor("return '${value}'")()`;
	const scriptExternalConstructor = `external.__proto__.constructor.constructor("return '${value}'")()`;

	const context = {
		external: {},
	};

	for (const [name, run] of sandboxes.entries()) {
		await t.test(name, async (t) => {
			const scripts = [
				scriptEval,
				scriptNewFunction,
				scriptGlobalthisConstructor,
				scriptObjectConstructor,
				scriptExternalConstructor,
			];

			await t.test("*default*", async (t) => {
				for (const script of scripts) {
					await t.test(`can '${script}'`, () => {
						const got = run({ script, context });
						const want = value;
						assert.equal(got, want);
					});
				}
			});

			await t.test("{strings: true}", async (t) => {
				const options = allowEval;

				for (const script of scripts) {
					await t.test(`can '${script}'`, () => {
						const got = run({ script, context, options });
						const want = value;
						assert.equal(got, want);
					});
				}
			});

			await t.test("{wasm: true}", async (t) => {
				const options = allowWasm;

				for (const script of scripts) {
					await t.test(`can '${script}'`, () => {
						const got = run({ script, context, options });
						const want = value;
						assert.equal(got, want);
					});
				}
			});

			await t.test("{wasm: false}", async (t) => {
				const options = disallowWasm;

				for (const script of scripts) {
					await t.test(`can '${script}'`, () => {
						const got = run({ script, context, options });
						const want = value;
						assert.equal(got, want);
					});
				}
			});
		});
	}

	await t.test("{strings: false}", async (t) => {
		const name1 = "vm.runInContext with vm.createContext context";
		await t.test(name1, async (t) => {
			const run = sandboxes.get(name1);

			const options = disallowEval;

			const scripts = [scriptEval, scriptNewFunction, scriptObjectConstructor];

			for (const script of scripts) {
				await t.test(`cannot '${script}'`, () => {
					assert.throws(() => run({ script, context, options }), {
						name: "EvalError",
						message: "Code generation from strings disallowed for this context",
					});
				});
			}

			const bypasses = [scriptGlobalthisConstructor, scriptExternalConstructor];

			for (const script of bypasses) {
				await t.test(`can '${script}'`, () => {
					const got = run({ script, context, options });
					const want = value;
					assert.equal(got, want);
				});
			}
		});

		const name2 = "vm.runInNewContext with null-prototype context";
		await t.test(name2, async (t) => {
			const run = sandboxes.get(name2);
			const options = disallowEval;

			const scripts = [
				scriptEval,
				scriptNewFunction,
				scriptObjectConstructor,
				scriptGlobalthisConstructor,
			];

			for (const script of scripts) {
				await t.test(`cannot '${script}'`, () => {
					assert.throws(() => run({ script, context, options }), {
						name: "EvalError",
						message: "Code generation from strings disallowed for this context",
					});
				});
			}

			const bypasses = [scriptExternalConstructor];

			for (const script of bypasses) {
				await t.test(`can '${script}'`, () => {
					const got = run({ script, context, options });
					const want = value;
					assert.equal(got, want);
				});
			}
		});
	});
});
