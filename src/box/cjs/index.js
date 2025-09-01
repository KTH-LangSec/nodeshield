import * as path from "node:path";
import * as fs from "node:fs";
import { fileURLToPath } from "node:url";

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

const kAppGlobals = Symbol.for("AppGlobals");
const kAllGlobals = Symbol.for("AllGlobals");
const kPrimordials = Symbol.for("Primordials");
const kSafeGlobals = Symbol.for("SafeGlobals");

const kGlobalsImport = Symbol.for("GlobalsCJS");
const kNodeModule = Symbol.for("NodeModule");
const kNodePath = Symbol.for("NodePath");
const kNodeVm = Symbol.for("NodeVm");

const kVmOptions = Symbol.for("VmOptions");
const kVmContext = Symbol.for("VmContext");

const kGlobalThis = Symbol.for("GlobalThis");
const kGlobal = Symbol.for("Global");
const kAmbientContext = Symbol.for("AmbientContext");

const kImportChecker = Symbol.for("ImportChecker");

const kImport = Symbol.for("Import");

const kGuestExports = Symbol.for("GuestExports");
const kGuestModule = Symbol.for("GuestModule");
const kGuestRequire = Symbol.for("GuestRequire");
const kHostExports = Symbol.for("HostExports");
const kHostModule = Symbol.for("HostModule");
const kHostRequire = Symbol.for("HostRequire");

const kCryptoClass = Symbol.for("Crypto");
const kCryptoKey = Symbol.for("CryptoKey");
const kCryptoVar = Symbol.for("crypto");
const kEval = Symbol.for("Eval");
const kFetch = Symbol.for("Fetch");
const kFunction = Symbol.for("Function");
const kProcess = Symbol.for("Process");
const kSubtleCrypto = Symbol.for("SubtleCrypto");

const kRequire = Symbol.for("Require");
const kExports = Symbol.for("Exports");
const kModule = Symbol.for("Module");
const kDirname = Symbol.for("__Dirname");
const kFilename = Symbol.for("__Filename");

const kNone = Symbol.for("Null");

const dirname = fileURLToPath(new URL(".", import.meta.url));
const template = fs.readFileSync(path.join(dirname, "template.js"), {
	encoding: "utf8",
});

export function generateBoxCjs({
	names: name,
	src,
	permissions,
	paths,
	strategy,
	file,
}) {
	const preamble = makePreamble({ name });

	const accessProps = {
		cjs: true,
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

			/// CommonJS semi-globals
			["___nameGuestExports___", name.for(kGuestExports)],
			["___nameGuestModule___", name.for(kGuestModule)],
			["___nameGuestRequire___", name.for(kGuestRequire)],
			["___nameHostExports___", name.for(kHostExports)],
			["___nameHostModule___", name.for(kHostModule)],
			["___nameHostRequire___", name.for(kHostRequire)],

			["___nameExports___", name.for(kExports)],
			["___nameRequire___", name.for(kRequire)],
			["___nameModule___", name.for(kModule)],
			["___nameDirname___", name.for(kDirname)],
			["___nameFilename___", name.for(kFilename)],

			/// imports
			["___nameGlobalsImport___", name.for(kGlobalsImport)],
			["___nameModule___", name.for(kNodeModule)],
			["___namePath___", name.for(kNodePath)],
			["___nameVm___", name.for(kNodeVm)],

			/// Other names
			["___nameAmbientContext___", name.for(kAmbientContext)],
			["___nameEval___", name.for(kEval)],
			["___nameFunction___", name.for(kFunction)],
			["___nameAllGlobals___", name.for(kAllGlobals)],
			["___nameAppGlobals___", name.for(kAppGlobals)],
			["___nameSafeGlobals___", name.for(kSafeGlobals)],
			["___nameGlobal___", name.for(kGlobal)],
			["___nameGlobalThis___", name.for(kGlobalThis)],
			["___nameImport___", name.for(kImport)],
			["___nameImportChecker___", name.for(kImportChecker)],
			["___nameNone___", name.for(kNone)],
			["___namePrimordials___", name.for(kPrimordials)],
			["___nameVmContext___", name.for(kVmContext)],
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
			["___pathOriginalRoot___", paths.inRoot],
			["___pathCloneRoot___", paths.outRoot],
			["___pathOutDirAbs___", paths.outDirAbs],
			["___pathOriginalDirAbsolute___", paths.ogDirAbs],
			["___pathOriginalFileAbsolute___", paths.ogFileAbs],
			["___pathOriginalFile___", paths.ogFile],
			["___valueInternalModulesPathRelative___", paths.hiddenRel],
		],

		/// Miscellaneous
		["___flagValue___", name.for("flag")],

		/// Finally, substitute the source code into the template.
		/// NOTE: This must happen last to avoid any of the other substitutions
		/// changing the source code.
		["___valueCode___", doEmbed(src, preamble, name)],
	];

	return replaceAllVerbatim(template, replacements).trim();
}

function doEmbed(src, preamble, name) {
	return embed(
		/// Preserve "use strict" and shebangs which, if they appear at the top of
		/// the file must appear before the preamble.
		///
		/// Also wrap the script in a top-level block statement to prevent breakin
		/// from accessing variables local to this module.
		///
		/// Put the preamble in a top-level block statement above that so that it
		/// can declare variables accessible to the script while allowing the script
		/// to redeclare them.
		///
		/// The result of this transformation will be:
		///     <header>(function(){ <preamble> { <source> } })()
		src.replace(
			/^(\s*#! *[a-z/]+\s*(?:\s[a-z]+)?\r?\n)?(\s*"use strict";|'use strict';)?/,
			`$1(function(require, exports, module, __dirname, __filename){$2${preamble.replace(/\$/g, "$$$$")}{\n`,
		) +
			"\n" + // newline is necessary in case the file ends with a line comment
			`}})(${name.for(kRequire)}, ${name.for(kExports)}, ${name.for(kModule)}, ${name.for(kDirname)}, ${name.for(kFilename)})`,
	);
}

function makePreamble({ name }) {
	return `
	  var globalThis = ${name.for(kGlobalThis)},
	      global = ${name.for(kGlobal)},
	      crypto = ${name.for(kCryptoVar)},
	      Crypto = ${name.for(kCryptoClass)},
	      CryptoKey = ${name.for(kCryptoKey)},
	      SubtleCrypto = ${name.for(kSubtleCrypto)},
	      fetch = ${name.for(kFetch)},
	      process = ${name.for(kProcess)};
	  globalThis.eval = eval;
	  globalThis.Function = Function;
	`
		.replace(/\s+/g, " ")
		.trim();
}
