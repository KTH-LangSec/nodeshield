import * as path from "node:path";
import * as fs from "node:fs";
import { fileURLToPath } from "node:url";

import * as acorn from "acorn";
import * as estraverse from "estraverse";

import { STRATEGIES } from "../../policy.js";
import { codeGenerationPolicy } from "../misc.js";
import { embed } from "../embed.js";
import { replaceAllVerbatim } from "../shared/templates.js";
import {
	generateEvalGlobal,
	generateFunctionGlobal,
} from "../shared/sensitive-globals/eval.js";
import { generateProcessGlobal } from "../shared/sensitive-globals/process.js";
import { generateFetchGlobal } from "../shared/sensitive-globals/fetch.js";
import { handleViolation } from "../shared/violation.js";
import {
	generateCryptoClassGlobal,
	generateCryptoKeyGlobal,
	generateCryptoVarGlobal,
	generateSubtleCryptoGlobal,
} from "../shared/sensitive-globals/crypto.js";

/** @typedef {import("./names.js").NameGenerator} NameGenerator */
/** @typedef {import("../policy.js").Strategy} Strategy */

/**
 * @typedef Options
 * @property {NameGenerator} names
 * @property {Paths} paths
 * @property {string} src The source code to put in a context.
 * @property {Permissions} permissions The permission policy for the context.
 * @property {Strategy} strategy The strategy when a policy violation occurs.
 * violation is detected.
 */

/**
 * @typedef Permissions
 * @property {boolean} code
 * @property {boolean} network
 * @property {boolean} process
 */

/**
 * @typedef Paths
 * @property {string} hiddenRel
 */

const kGlobalsImport = Symbol.for("GlobalsCJS");
const kAppGlobals = Symbol.for("AppGlobals");
const kAllGlobals = Symbol.for("AllGlobals");
const kPrimordials = Symbol.for("Primordials");
const kSafeGlobals = Symbol.for("SafeGlobals");

const kPath = Symbol.for("NodePath");
const kVm = Symbol.for("NodeVm");

const kVmOptions = Symbol.for("VmOptions");
const kVmContext = Symbol.for("VmContext");
const kVmModule = Symbol.for("VmModule");
const kVmContextOptions = Symbol.for("VmContextOptions");

const kGlobal = Symbol.for("Global");
const kGlobalThis = Symbol.for("GlobalThis");
const kAmbientContext = Symbol.for("AmbientContext");

const kImport = Symbol.for("Import");
const kImportChecker = Symbol.for("ImportChecker");

const kCryptoClass = Symbol.for("Crypto");
const kCryptoKey = Symbol.for("CryptoKey");
const kCryptoVar = Symbol.for("crypto");
const kEval = Symbol.for("Eval");
const kFetch = Symbol.for("Fetch");
const kFunction = Symbol.for("Function");
const kProcess = Symbol.for("Process");
const kSubtleCrypto = Symbol.for("SubtleCrypto");

const kNone = Symbol.for("Null");

const dirname = fileURLToPath(new URL(".", import.meta.url));
const template = fs.readFileSync(path.join(dirname, "template.js"), {
	encoding: "utf8",
});

/**
 * @param {Options} options
 * @returns {string}
 */
export function generateBoxMjs({
	names: name,
	src,
	permissions,
	paths,
	strategy,
	file,
}) {
	let ast = null;
	try {
		ast = acorn.parse(src, {
			ecmaVersion: "latest",
			sourceType: "module",
		});
	} catch {
		// console.log(`[D] parsing ESM source code failed for ${file}, falling back to heuristics`);
	}

	const exports = getEsmExports({ ast, src, file });
	const preamble = makePreamble({ ast, name, permissions, strategy });

	const accessProps = {
		id: file,
		name,
		permissions,
		strategy,
	};

	const invalidImport = handleViolation({
		name,
		strategy,
		what: "${specifier}",
		who: file,
	});

	const replacements = [
		["___who___", file],

		/// Variable names
		...[
			/// Sensitive globals
			["___nameCryptoClass___", name.for(kCryptoClass)],
			["___nameCryptoKey___", name.for(kCryptoKey)],
			["___nameCryptoVar___", name.for(kCryptoVar)],
			["___nameEval___", name.for(kEval)],
			["___nameFetch___", name.for(kFetch)],
			["___nameFunction___", name.for(kFunction)],
			["___nameProcess___", name.for(kProcess)],
			["___nameSubtleCrypto___", name.for(kSubtleCrypto)],

			/// Other names
			["___nameAmbientContext___", name.for(kAmbientContext)],
			["___nameGlobalsImport___", name.for(kGlobalsImport)],
			["___nameGlobalsAll___", name.for(kAllGlobals)],
			["___nameGlobalsApp___", name.for(kAppGlobals)],
			["___nameGlobalsSafe___", name.for(kSafeGlobals)],
			["___nameGlobalThis___", name.for(kGlobalThis)],
			["___nameGlobal___", name.for(kGlobal)],
			["___nameImport___", name.for(kImport)],
			["___nameImportChecker___", name.for(kImportChecker)],
			["___nameNone___", name.for(kNone)],
			["___namePath___", name.for(kPath)],
			["___namePrimordials___", name.for(kPrimordials)],
			["___nameVm___", name.for(kVm)],
			["___nameVmContext___", name.for(kVmContext)],
			["___nameVmContextOptions___", name.for(kVmContextOptions)],
			["___nameVmModule___", name.for(kVmModule)],
			["___nameVmOptions___", name.for(kVmOptions)],
		],

		/// Sensitive globals: access
		...[
			/// Capability: code
			["___handleAccessEval___", generateEvalGlobal(accessProps)],
			["___handleAccessFunction___", generateFunctionGlobal(accessProps)],
			[
				"___valueOverrideEval___",
				!permissions.code && strategy !== STRATEGIES.log,
			],

			/// Capability: crypto
			["___handleAccessCryptoClass___", generateCryptoClassGlobal(accessProps)],
			["___handleAccessCryptoKey___", generateCryptoKeyGlobal(accessProps)],
			["___handleAccessCryptoVar___", generateCryptoVarGlobal(accessProps)],
			[
				"___handleAccessSubtleCrypto___",
				generateSubtleCryptoGlobal(accessProps),
			],

			/// Capability: network
			["___handleAccessFetch___", generateFetchGlobal(accessProps)],

			/// Capability: system
			["___handleAccessProcess___", generateProcessGlobal(accessProps)],
		],

		/// Sensitive globals: globalThis visibility
		...[
			[
				"___handleOwnKeysCode___",
				permissions.code ? "'eval', 'Function'" : "void 0",
			],
			["___handleOwnKeysCommand___", "void 0"],
			[
				"___handleOwnKeysCrypto___",
				permissions.crypto
					? "'Crypto', 'crypto', 'CryptoKey', 'SubtleCrypto'"
					: "void 0",
			],
			["___handleOwnKeysFs___", "void 0"],
			[
				"___handleOwnKeysNetwork___",
				permissions.network ? "'fetch'" : "void 0",
			],
			[
				"___handleOwnKeysSystem___",
				permissions.process ? "'process'" : "void 0",
			],
		],

		// Import policy
		...[
			["___handleInvalidImport___", invalidImport],
			[
				"___valueImportPackages___",
				permissions.import.packages.map((pkg) => `"${pkg}"`).join(","),
			],
			[
				"___valueImportFiles___",
				permissions.import.files.map((file) => `"${file}"`).join(","),
			],
		],

		/// Exports
		...[
			[
				"___defaultExport___",
				exports.default
					? `export default ${name.for(kVmModule)}.namespace.default`
					: "",
			],
			[
				"___classExports___",
				Array.from(exports.class.values())
					.map(
						(exportName) =>
							`export const ${exportName} = ${name.for(kVmModule)}.namespace.${exportName};`,
					)
					.join("\n"),
			],
			[
				"___functionExports___",
				Array.from(exports.const.values())
					.map(
						(exportName) =>
							`export const ${exportName} = ${name.for(kVmModule)}.namespace.${exportName};`,
					)
					.join("\n"),
			],
			[
				"___constExports___",
				Array.from(exports.function.values())
					.map(
						(exportName) =>
							`export const ${exportName} = ${name.for(kVmModule)}.namespace.${exportName};`,
					)
					.join("\n"),
			],
		],

		/// VM configuration
		...[
			[
				"___valueCodeGenerationPolicy___",
				codeGenerationPolicy({ permissions, strategy }),
			],
			["___valueLineOffset___", -1],
			["___valueColumnOffset___", 0],
		],

		/// Paths
		...[
			["___valueOutDirAbs___", paths.outDirAbs],
			["___valueDirname___", path.dirname(paths.ogFileAbs)],
			["___valueFileName___", paths.ogFile],
			["___valueFilePath___", paths.ogFileAbs],
			["___valueFileUrl___", `file://${paths.ogFileAbs}`],
			["___valueInternalModulesPathRelative___", paths.hiddenRel],
		],

		/// Miscellaneous
		["___flagValue___", name.for("flag")],

		/// Finally, substitute the source code into the template.
		/// NOTE: This must happen last to avoid any of the other substitutions
		/// changing the source code.
		["___valueCode___", embed(addPreamble(src, preamble))],
	];

	return replaceAllVerbatim(template, replacements).trim();
}

function getEsmExports({ ast, src, file }) {
	const classExports = new Set();
	const constExports = new Set();
	const functionExports = new Set();
	let hasDefaultExport = false;

	try {
		estraverse.replace(ast, {
			enter: (node) => {
				switch (node.type) {
					case "ExportNamedDeclaration":
						if (node.declaration) {
							switch (node.declaration.type) {
								case "ClassDeclaration":
									classExports.add(node.declaration.id.name);
									break;
								case "FunctionDeclaration":
									functionExports.add(node.declaration.id.name);
									break;
								case "VariableDeclaration":
									for (const declaration of node.declaration.declarations) {
										constExports.add(declaration.id.name);
									}
									break;
								default:
									console.log(
										"UNSUPPORTED",
										"ExportNamedDeclaration",
										"node.declaration.type",
										node.declaration.type,
									);
							}
						}

						if (node.specifiers.length > 0) {
							for (const specifier of node.specifiers) {
								switch (specifier.type) {
									case "ExportSpecifier":
										const name = specifier.exported.name;
										if (name === "default") {
											hasDefaultExport = true;
										} else {
											constExports.add(specifier.exported.name);
										}
										break;
									default:
										console.log(
											"UNSUPPORTED",
											"ExportNamedDeclaration",
											"node.specifiers[*].type",
											specifier.type,
										);
								}
							}
						}

						break;
					case "ExportDefaultDeclaration":
						hasDefaultExport = true;
						break;
					case "ExportSpecifier":
						const name = node.exported.name;
						if (name === "default") {
							hasDefaultExport = true;
						} else {
							constExports.add(node.exported.name);
						}
						break;
				}
			},
		});
	} catch (error) {
		// console.log(`[D] traversing ESM source code for exports failed for ${file}, falling back to heuristics`);

		let match;

		{
			const expr = /export\s+class\s+(?<name>[a-zA-Z$_][a-zA-Z0-9$_]*)/g;
			while ((match = expr.exec(src)) !== null) {
				classExports.add(match.groups.name);
			}
		}

		{
			const expr = /export\s+const\s+(?<name>[a-zA-Z$_][a-zA-Z0-9$_]*)/g;
			while ((match = expr.exec(src)) !== null) {
				constExports.add(match.groups.name);
			}
		}

		{
			const expr1 = /export\s+default\s/g;
			if (expr1.test(src)) {
				hasDefaultExport = true;
			}

			const expr2 = /\w+ as default(\s|\,|\}|$)/g;
			if (expr2.test(src)) {
				hasDefaultExport = true;
			}
		}

		{
			const expr =
				/export\s+(async\s+)?function\s+(?<name>[a-zA-Z$_][a-zA-Z0-9$_]*)\*?/g;
			while ((match = expr.exec(src)) !== null) {
				functionExports.add(match.groups.name);
			}
		}
	} finally {
		return {
			const: constExports,
			class: classExports,
			function: functionExports,
			default: hasDefaultExport,
		};
	}
}

export function addPreamble(src, preamble) {
	return src.replace(
		/// Preserve "use strict" and shebangs which, if they appear at the top of
		/// the file must appear before the preamble.
		/^(\s*"use strict";|'use strict';|\s*#! *[a-z/]+\s*(\s[a-z]+)?\r?\n)?/,
		`$1${preamble.replace(/\$/g, "$$$$")}\n`,
	);
}

function makePreamble({ ast, name, permissions, strategy }) {
	const defines = {};
	const check = (ident) => {
		switch (ident) {
			case "Crypto":
				defines.Crypto = true;
				break;
			case "crypto":
				defines.crypto = true;
				break;
			case "CryptoKey":
				defines.CryptoKey = true;
				break;
			case "SubtleCrypto":
				defines.SubtleCrypto = true;
				break;
			case "fetch":
				defines.fetch = true;
				break;
			case "process":
				defines.process = true;
				break;
		}
	};
	try {
		estraverse.replace(ast, {
			enter: (node, parent) => {
				if (parent === null || parent.type !== "Program") {
					return;
				}

				switch (node.type) {
					case "VariableDeclaration":
						for (const declaration of node.declarations) {
							check(declaration.id.name);
						}
						break;
					case "ImportDeclaration":
						for (const specifier of node.specifiers) {
							check(specifier.local.name);
						}
						break;
				}
			},
		});
	} catch {}

	return `
		var globalThis = ${name.for(kGlobalThis)};
		var global = ${name.for(kGlobal)};
		${defines.crypto ? "" : `var crypto = ${name.for(kCryptoVar)};`}
		${defines.Crypto ? "" : `var Crypto = ${name.for(kCryptoClass)};`}
		${defines.CryptoKey ? "" : `var CryptoKey = ${name.for(kCryptoKey)};`}
		${defines.SubtleCrypto ? "" : `var SubtleCrypto = ${name.for(kSubtleCrypto)};`}
		${defines.fetch ? "" : `var fetch = ${name.for(kFetch)};`}
		${defines.process ? "" : `var process = ${name.for(kProcess)};`}
		${permissions.code || strategy === STRATEGIES.log ? "globalThis.eval = eval;" : ""}
		${permissions.code || strategy === STRATEGIES.log ? "globalThis.Function = Function;" : ""}
	`
		.replace(/\s+/g, " ")
		.trim();
}
