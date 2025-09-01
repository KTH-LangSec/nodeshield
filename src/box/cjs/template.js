const flag = "___flagValue___";

///
const ___nameModule___ = require("___valueInternalModulesPathRelative___/module.cjs");
const ___namePath___ = require("___valueInternalModulesPathRelative___/path.cjs");
const ___nameVm___ = require("___valueInternalModulesPathRelative___/vm.cjs");
const ___nameGlobalsImport___ = require("___valueInternalModulesPathRelative___/globals.cjs");

///
const ___nameAppGlobals___ = ___nameGlobalsImport___.app;
const ___namePrimordials___ = ___nameGlobalsImport___.primordials;
const ___nameSafeGlobals___ = ___nameGlobalsImport___.safe;
const ___nameNone___ = ___nameGlobalsImport___.none;

/// Dedefine all CJS semi-globals after obtaining references for local use.
const ___nameHostExports___ = exports;
const ___nameHostModule___ = module;
const ___nameHostRequire___ = require;
exports = null;
module = null;
require = null;
__dirname = null;
__filename = null;

/// Create a function to handle (static and dynamic) require and imports.
const [___nameImport___, ___nameGuestRequire___] = (function () {
	/// Provide a local variable to access sensitive globals.
	/// (used by substituted code.)
	const ___nameAllGlobals___ = ___nameGlobalsImport___.all;

	/// Import allowlist.
	const allowedPackages = ___namePrimordials___.ObjectFreeze([
		___valueImportPackages___,
	]);
	const allowedFiles = ___namePrimordials___.ObjectFreeze([
		___valueImportFiles___,
	]);

	/// Helper function to determine if an import attempt is allowed.
	const isImportAllowed = function (specifier) {
		/// If it's a package from the allowlist, it's allowed
		if (___namePrimordials___.ArrayIncludes(allowedPackages, specifier)) {
			return true;
		}

		/// If it's a file from the allowlist, it's allowed.
		/// We compare using the absolute path to handle variations of relative paths
		const absolutePath = ___namePath___.resolve(
			"___pathOutDirAbs___",
			specifier,
		);
		if (___namePrimordials___.ArrayIncludes(allowedFiles, absolutePath)) {
			return true;
		}

		/// If it's a import inside a package on the allow list (e.g. 'lodash/curry'),
		/// it's allowed (provided it is not trying to go up any directories).
		if (
			___namePrimordials___.ArraySome(
				allowedPackages,
				(pkg) =>
					___namePrimordials___.StringStartsWith(specifier, `${pkg}/`) &&
					!___namePrimordials___.StringIncludes(specifier, ".."),
			)
		) {
			return true;
		}

		/// If it's a built-in module (other than the privileged ones) it's allowed.
		/// (Privileged built-in modules must be explicitly in the allowlist.)
		if (___nameModule___.isUnprivilegedBuiltin(specifier)) {
			return true;
		}

		return false;
	};

	/// Policy-enforcing import functions.
	const guestImport = function (specifier) {
		/// Handle leading and trailing whitespace, which is ignored by Node.js.
		specifier = ___namePrimordials___.StringTrim(specifier);

		/// Handle the scenario where the code attempts to import an original file by
		/// its absolute path.
		specifier = specifier.replace(
			"___pathOriginalRoot___",
			"___pathCloneRoot___",
		);

		/// Check if the import is allowed, and deal with it if it's not.
		if (!isImportAllowed(specifier)) {
			___handleInvalidImport___;
		}

		/// Handle the built-in '(node:)module' separately because it can be used to
		/// create a `require` function.
		if (specifier === "module" || specifier === "node:module") {
			return ___nameModule___.createModuleExport(
				(specifier) => isImportAllowed(specifier),
				() => {
					___handleInvalidImport___;
				},
			);
		}

		/// If it is allowed to import specifier, import it and return the result.
		// ___namePrimordials___.ConsoleLog(`[A] importing '${specifier}' allowed in '___who___'`);
		return import(specifier);
	};

	const guestRequire = function require(specifier) {
		/// Handle leading and trailing whitespace, which is ignored by Node.js.
		specifier = ___namePrimordials___.StringTrim(specifier);

		/// Handle the scenario where the code attempts to import an original file by
		/// its absolute path.
		specifier = specifier.replace(
			"___pathOriginalRoot___",
			"___pathCloneRoot___",
		);

		/// Check if the import is allowed, and deal with it if it's not.
		if (!isImportAllowed(specifier)) {
			___handleInvalidImport___;
		}

		/// Handle the built-in '(node:)module' separately because it can be used to
		/// create a `require` function.
		if (specifier === "module" || specifier === "node:module") {
			return ___nameModule___.createModuleExport(
				(specifier) => isImportAllowed(specifier),
				(specifier) => {
					___handleInvalidImport___;
				},
			);
		}

		/// If it is allowed to require specifier, require it and return the result.
		// ___namePrimordials___.ConsoleLog(`[A] importing '${specifier}' allowed in '___who___'`);
		return ___nameHostRequire___(specifier);
	};

	/// Add necessary fields to user `require`.
	guestRequire.cache = ___namePrimordials___.ObjectCreate(null);
	guestRequire.main = ___namePrimordials___.ObjectAssign(
		___namePrimordials___.ObjectCreate(null),
		{
			filename: "___pathOriginalFileAbsolute___",
			path: ".",
			exports: ___nameHostExports___,
			loaded: false,
			children: [],
			paths: [...___nameHostModule___.paths],
		},
	);
	guestRequire.resolve = function (specifier, options) {
		if (!isImportAllowed(specifier)) {
			___handleInvalidImport___;
		}

		return ___nameHostRequire___
			.resolve(specifier, options)
			.replace("___pathCloneRoot___", "___pathOriginalRoot___");
	};

	return [guestImport, guestRequire];
})();

/// Create a CommonJS `module` object to provide to the context.
const [___nameGuestExports___, ___nameGuestModule___] = (function () {
	/// Define the `exports` pointer of the guest. We just point to the host since
	/// the host's `exports` object is not sensitive.
	const guestExports = ___nameHostExports___;

	/// Define a new object to be used as `module`. This object will trap on all
	/// property definitions and, if `exports` is set, reflect that back on the
	/// `module` object of the host so that anyone importing this file can see the
	/// exported fields.
	const guestModule = ___namePrimordials___.NewProxy(
		___namePrimordials___.ObjectAssign(
			___namePrimordials___.ObjectCreate(null),
			{
				exports: guestExports,
				children: [],
				filename: "___pathOriginalFileAbsolute___",
				id: "___pathOriginalFileAbsolute___",
				loaded: false,
				path: ".",
				paths: [...___nameHostModule___.paths],
				require: ___nameGuestRequire___,
			},
		),
		___namePrimordials___.ObjectFreeze(
			___namePrimordials___.ObjectAssign(
				___namePrimordials___.ObjectCreate(null),
				{
					set(target, property, newValue, _receiver) {
						let reflected = true;
						if (property === "exports") {
							reflected = ___namePrimordials___.ReflectSet(
								___nameHostModule___,
								property,
								newValue,
							);
						}

						return (
							reflected &&
							___namePrimordials___.ReflectSet(target, property, newValue)
						);
					},
					defineProperty(target, property, attributes) {
						return (
							___namePrimordials___.ReflectDefineProperty(
								___nameHostModule___,
								property,
								attributes,
							) &&
							___namePrimordials___.ReflectDefineProperty(
								target,
								property,
								attributes,
							)
						);
					},
				},
			),
		),
	);

	return [guestExports, guestModule];
})();

/// Create the ambient context as well as `globalThis` variable.
const [___nameGlobalThis___, ___nameAmbientContext___] = (function () {
	/// Local references for the 'eval' and 'Function' inside this box. So that
	/// these can be made accessible via 'globalThis' and 'global'.
	let ___nameEval___ = ___nameNone___;
	let ___nameFunction___ = ___nameNone___;

	/// Create the 'globalThis' (and 'global') object.
	const ___nameGlobalThis___ = (function () {
		/// Provide a local variable to access sensitive globals.
		/// (used by substituted code.)
		const ___nameAllGlobals___ = ___nameGlobalsImport___.all;

		/// Initialize the globalThis object.
		return ___namePrimordials___.NewProxy(
			___namePrimordials___.ObjectCreate(null),
			___namePrimordials___.ObjectAssign(
				___namePrimordials___.ObjectCreate(null),
				{
					get(_target, property, _receiver) {
						/// Properties from the application globals have priority because they are
						/// explicitly defined or overridden by the application.
						if (
							___namePrimordials___.ObjectHasOwn(___nameAppGlobals___, property)
						) {
							return ___nameAppGlobals___[property];
						}

						/// Check the ambient context for the property. This may happen because
						/// non-strict CJS can assign to the ambient context.
						else if (
							___namePrimordials___.ObjectHasOwn(
								___nameAmbientContext___,
								property,
							)
						) {
							return ___nameAmbientContext___[property];
						}

						/// Explicitly handle 'globalThis' and 'global'.
						else if (property === "globalThis" || property === "global") {
							return ___nameGlobalThis___;
						}

						/// Else allow access if it's a safe global.
						else if (
							___namePrimordials___.ObjectHasOwn(
								___nameSafeGlobals___,
								property,
							)
						) {
							return ___nameSafeGlobals___[property];
						}

						/// Explicitly handle sensitive globals based on permissions.
						else if (property === "crypto") {
							___handleAccessCryptoVar___;
						} else if (property === "Crypto") {
							___handleAccessCryptoClass___;
						} else if (property === "CryptoKey") {
							___handleAccessCryptoKey___;
						} else if (property === "eval") {
							___handleAccessEval___;
						} else if (property === "fetch") {
							___handleAccessFetch___;
						} else if (property === "Function") {
							___handleAccessFunction___;
						} else if (property === "process") {
							___handleAccessProcess___;
						} else if (property === "SubtleCrypto") {
							___handleAccessSubtleCrypto___;
						}

						/// Else, return undefined if it's not found.
						return undefined;
					},

					has(_target, property) {
						const keys =
							___namePrimordials___.ReflectOwnKeys(___nameGlobalThis___);
						return keys.includes(property);
					},

					set(_target, property, value) {
						/// Both 'eval' and 'Function' are bound in a preamble to the module. The
						/// logic here catches those binds and stores the reference so they are
						/// accessible from 'globalThis' and 'global'. Subsequent assignments to
						/// 'eval' and 'Function' pass through and override using the app globals.
						if (property === "eval" && ___nameEval___ === ___nameNone___) {
							___nameEval___ = value;
							return true;
						} else if (
							property === "Function" &&
							___nameFunction___ === ___nameNone___
						) {
							___nameFunction___ = value;
							return true;
						}

						/// All new globals are set on the app global which take precedence when
						/// accessing globals.
						const result = ___namePrimordials___.ReflectSet(
							___nameAppGlobals___,
							property,
							value,
						);

						/// Update the ambient context as well because it doesn't automatically
						/// pick up changes from the app globals.
						if (result) {
							___namePrimordials___.ObjectDefineProperty(
								___nameAmbientContext___,
								property,
								___namePrimordials___.ObjectAssign(
									___namePrimordials___.ObjectCreate(null),
									{
										/// Configurable so that it can be replaced later.
										configurable: true,

										/// Get simply returns the current value. The setter will update
										/// this value and a re-assignment will re-capture the value.
										get() {
											return value;
										},

										/// Set updates the apps global name space and reflects the
										/// changes here too.
										set(newValue) {
											/// Whenever a global value is set, update it in the app globals
											/// which take precedence over everything else.
											const result = ___namePrimordials___.ReflectSet(
												___nameAppGlobals___,
												key,
												newValue,
											);

											/// If it could be set in the app globals, reflect the change
											/// locally.
											if (result) {
												value = newValue;
											}

											return result;
										},
									},
								),
							);
						}

						return result;
					},

					ownKeys(_target) {
						/// Collect the keys in a set to automatically filter out duplicates.
						const keys = ___namePrimordials___.NewSet([
							/// Always show access to all app-specific globals, safe globals,
							...___namePrimordials___.ReflectOwnKeys(___nameAppGlobals___),
							...___namePrimordials___.ReflectOwnKeys(___nameSafeGlobals___),

							/// Also always show the 'globalThis' and 'global' keys.
							"global",
							"globalThis",

							/// But show access to sensitive globals only depending on permissions.
							___handleOwnKeysCode___,
							___handleOwnKeysCommand___,
							___handleOwnKeysCrypto___,
							___handleOwnKeysFs___,
							___handleOwnKeysNetwork___,
							___handleOwnKeysSystem___,
						]);

						/// Remove undefined keys (which are invalid).
						keys.delete(void 0);

						/// Return all keys as an array (required format).
						return ___namePrimordials___.ArrayFrom(keys);
					},
				},
			),
		);
	})();

	/// Create the ambient context object for the module.
	///
	/// This is separated from the "globalThis"(/"global") object because it behaves
	/// differently in several cases (e.g missing property accesses).
	const ___nameAmbientContext___ = (function () {
		/// Provide a local variable to access sensitive globals.
		/// (used by substituted code.)
		const ___nameAllGlobals___ = ___nameGlobalsImport___.all;

		/// Initialize the ambient context object.
		const ___nameAmbientContext___ = ___namePrimordials___.ObjectCreate(null);

		/// Attach sensitive global with a randomized name so breakins can't access.
		/// The script preamble we add will bind it to a locally scoped variable that
		/// has the original name.
		for (const [name, valueFn] of [
			["___nameGlobalThis___", () => ___nameGlobalThis___],
			["___nameGlobal___", () => ___nameGlobalThis___],

			/// CommonJS
			["___nameRequire___", () => ___nameGuestRequire___],
			["___nameExports___", () => ___nameGuestExports___],
			["___nameModule___", () => ___nameGuestModule___],
			["___nameDirname___", () => "___pathOriginalDirAbsolute___"],
			["___nameFilename___", () => "___pathOriginalFileAbsolute___"],

			/// capability: crypto
			[
				"___nameCryptoClass___",
				() => {
					___handleAccessCryptoClass___;
				},
			],
			[
				"___nameCryptoKey___",
				() => {
					___handleAccessCryptoKey___;
				},
			],
			[
				"___nameCryptoVar___",
				() => {
					___handleAccessCryptoVar___;
				},
			],
			[
				"___nameSubtleCrypto___",
				() => {
					___handleAccessSubtleCrypto___;
				},
			],

			/// capability: network
			[
				"___nameFetch___",
				() => {
					___handleAccessFetch___;
				},
			],

			/// capability: system
			[
				"___nameProcess___",
				() => {
					___handleAccessProcess___;
				},
			],
		]) {
			___namePrimordials___.ObjectDefineProperty(
				___nameAmbientContext___,
				name,
				___namePrimordials___.ObjectFreeze(
					___namePrimordials___.ObjectAssign(
						___namePrimordials___.ObjectCreate(null),
						{
							/// One time getter that deletes this property from the object once it
							/// is accessed.
							get() {
								delete ___nameAmbientContext___[name];
								return valueFn();
							},

							/// Must be configurable so that it can be deleted.
							configurable: true,
						},
					),
				),
			);
		}

		/// If using `eval` (and friends) is not allowed, bind the ambient name to a
		/// function that handles it by throwing or exiting. Else, use the `eval`
		/// function created by the VM module.
		if (___valueOverrideEval___) {
			___namePrimordials___.ObjectDefineProperty(
				___nameAmbientContext___,
				"eval",
				___namePrimordials___.ObjectFreeze(
					___namePrimordials___.ObjectAssign(
						___namePrimordials___.ObjectCreate(null),
						{
							get() {
								___handleAccessEval___;
							},
						},
					),
				),
			);

			___namePrimordials___.ObjectDefineProperty(
				___nameAmbientContext___,
				"Function",
				___namePrimordials___.ObjectFreeze(
					___namePrimordials___.ObjectAssign(
						___namePrimordials___.ObjectCreate(null),
						{
							get() {
								___handleAccessFunction___;
							},
						},
					),
				),
			);
		}

		/// Attach all non-sensitive globals.
		___namePrimordials___.ArrayForEach(
			[
				/// First attach all original globals. This covers only the "safe" globals
				/// as the sensitive globals are covered separately before this.
				...___namePrimordials___.ObjectEntries(___nameSafeGlobals___),

				/// Second, add all app globals. This is because they may override globals
				/// from the application's perspective.
				...___namePrimordials___.ObjectEntries(___nameAppGlobals___),
			],
			([property, value], _i, _array) => {
				___namePrimordials___.ObjectDefineProperty(
					___nameAmbientContext___,
					property,
					___namePrimordials___.ObjectAssign(
						___namePrimordials___.ObjectCreate(null),
						{
							/// Configurable so that it can be replaced later.
							configurable: true,

							/// Get simply returns the current value. The setter will update this
							/// value and a re-assignment will re-capture the value.
							get() {
								return value;
							},

							/// Set updates the apps global name space and reflects the changes
							/// here too.
							set(newValue) {
								/// Whenever a global value is set, update it in the app globals
								/// which take precedence over everything else.
								const result = ___namePrimordials___.ReflectSet(
									___nameAppGlobals___,
									property,
									newValue,
								);

								/// If it could be set in the app globals, reflect the change
								/// locally.
								if (result) {
									value = newValue;
								}

								return result;
							},
						},
					),
				);
			},
		);

		return ___nameAmbientContext___;
	})();

	return [___nameGlobalThis___, ___nameAmbientContext___];
})();

{
	const codeGenerationPolicy = ___namePrimordials___.ObjectFreeze(
		___namePrimordials___.ObjectAssign(
			___namePrimordials___.ObjectCreate(null),
			___valueCodeGenerationPolicy___,
		),
	);

	/// Create the options for the VM context for the VM instance.
	const vmContextOptions = ___namePrimordials___.ObjectFreeze(
		___namePrimordials___.ObjectAssign(
			___namePrimordials___.ObjectCreate(null),
			{
				// Configure the code generation policy for the module.
				codeGeneration: codeGenerationPolicy,
			},
		),
	);

	/// Create the VM context object.
	const ___nameVmContext___ = ___nameVm___.createContext(
		___nameAmbientContext___,
		vmContextOptions,
	);

	/// Create the VM options object.
	const ___nameVmOptions___ = ___namePrimordials___.ObjectFreeze(
		___namePrimordials___.ObjectAssign(
			___namePrimordials___.ObjectCreate(null),
			{
				/// Configure vm to use the original file's filename.
				filename: "___pathOriginalFile___",

				/// Adjust line and column number based on the preamble
				lineOffset: ___valueLineOffset___,
				columnOffset: ___valueColumnOffset___,

				/// Configure the code generation policy for the module based on its
				/// permissions.
				contextCodeGeneration: codeGenerationPolicy,

				/// Handle dynamic imports.
				importModuleDynamically: (specifier) => ___nameImport___(specifier),
			},
		),
	);

	/// Create a VM from the source text of the target module.
	new ___nameVm___.runInContext(
		`___valueCode___`,
		___nameVmContext___,
		___nameVmOptions___,
	);
}
