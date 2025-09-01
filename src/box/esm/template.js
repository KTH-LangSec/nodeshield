const flag = "___flagValue___";

///
import { hostVm as ___nameVm___ } from "___valueInternalModulesPathRelative___/vm.mjs";
import {
	createModuleExport,
	isUnprivilegedBuiltin,
} from "___valueInternalModulesPathRelative___/module.mjs";
import { hostPath as ___namePath___ } from "___valueInternalModulesPathRelative___/path.mjs";
import ___nameGlobalsImport___ from "___valueInternalModulesPathRelative___/globals.cjs";

///
const ___nameGlobalsApp___ = ___nameGlobalsImport___.app;
const ___nameGlobalsSafe___ = ___nameGlobalsImport___.safe;
const ___namePrimordials___ = ___nameGlobalsImport___.primordials;
const ___nameNone___ = ___nameGlobalsImport___.none;

/// Create a function to handle (static and dynamic) imports.
const ___nameImport___ = (function () {
	/// Provide a local variable to access sensitive globals.
	/// (used by substituted code.)
	const ___nameGlobalsAll___ = ___nameGlobalsImport___.all;

	/// Import allowlist.
	const allowedPackages = ___namePrimordials___.ObjectFreeze([
		___valueImportPackages___,
	]);
	const allowedFiles = ___namePrimordials___.ObjectFreeze([
		___valueImportFiles___,
	]);

	/// Helper function to determine if an import attempt is allowed.
	const isImportAllowed = function (specifier) {
		/// If it's a package from the allow list, it's allowed
		if (___namePrimordials___.ArrayIncludes(allowedPackages, specifier)) {
			return true;
		}

		/// If it's a file from the allowlist, it's allowed. We compare using the
		/// absolute path to handle variations of relative paths.
		const absolutePath = ___namePath___.resolve(
			"___valueOutDirAbs___",
			specifier,
		);
		if (___namePrimordials___.ArrayIncludes(allowedFiles, absolutePath)) {
			return true;
		}

		/// If it's a import inside a package on the allow list (e.g. 'lodash/curry'),
		/// it's allowed (provided it is not trying to go up any directories).
		if (
			___namePrimordials___.ArraySome(allowedPackages, (pkg) => {
				return (
					___namePrimordials___.StringStartsWith(specifier, `${pkg}/`) &&
					!___namePrimordials___.StringIncludes(specifier, "..")
				);
			})
		) {
			return true;
		}

		/// If it's a built-in module (other than the privileged ones) it's allowed.
		/// (Privileged built-in modules must be explicitly in the allowlist.)
		if (isUnprivilegedBuiltin(specifier)) {
			return true;
		}

		return false;
	};

	/// Policy-enforcing import function.
	const guestImport = function (specifier, extra) {
		/// Handle leading and trailing whitespace, which is ignored by Node.js.
		specifier = ___namePrimordials___.StringTrim(specifier);

		/// Check if the import is allowed, and deal with it if it's not.
		if (!isImportAllowed(specifier)) {
			___handleInvalidImport___;
		}

		/// Handle the built-in '(node:)module' separately because it can be used to
		/// create a `require` function.
		if (specifier === "module" || specifier === "node:module") {
			return createModuleExport(
				(specifier) => {
					return isImportAllowed(specifier);
				},
				(specifier) => {
					___handleInvalidImport___;
				},
			);
		}

		/// If it is allowed to import specifier, import it and return the result.
		// ___namePrimordials___.ConsoleLog(`[A] importing '${specifier}' allowed in '___who___'`);
		return import(specifier, extra);
	};

	return guestImport;
})();

/// Create the ambient context as well as `globalThis` variable.
const [___nameGlobalThis___, ___nameAmbientContext___] = (function () {
	/// Local references for the 'eval' and 'Function' inside this. So that these
	/// can be made accessible via 'globalThis' and 'global'.
	let ___nameEval___ = ___nameNone___;
	let ___nameFunction___ = ___nameNone___;

	/// Create the `globalThis` (and `global`) object.
	const ___nameGlobalThis___ = (function () {
		/// Provide a local variable to access sensitive globals.
		/// (used by substituted code.)
		const ___nameGlobalsAll___ = ___nameGlobalsImport___.all;

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
							___namePrimordials___.ObjectHasOwn(___nameGlobalsApp___, property)
						) {
							return ___nameGlobalsApp___[property];
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
								___nameGlobalsSafe___,
								property,
							)
						) {
							return ___nameGlobalsSafe___[property];
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
						return void 0;
					},

					getOwnPropertyDescriptor(_target, property) {
						/// Properties from the application globals have priority because they are
						/// explicitly defined or overridden by the application.
						if (
							___namePrimordials___.ObjectHasOwn(___nameGlobalsApp___, property)
						) {
							return ___namePrimordials___.ObjectGetOwnPropertyDescriptor(
								___nameGlobalsApp___,
								property,
							);
						}

						/// Explicitly handle 'globalThis' and 'global'.
						if (property === "globalThis" || property === "global") {
							return {
								value: ___nameGlobalThis___,
								writable: true,
								enumerable: false,
								configure: true,
							};
						}

						/// Else allow access if it's a safe global.
						if (
							___namePrimordials___.ObjectHasOwn(
								___nameGlobalsSafe___,
								property,
							)
						) {
							return ___namePrimordials___.ObjectGetOwnPropertyDescriptor(
								___nameGlobalsSafe___,
								property,
							);
						}

						/// Default to whatever the property descriptor for a missing property is
						return ___namePrimordials___.ObjectGetOwnPropertyDescriptor(
							___namePrimordials___.ObjectCreate(null),
							property,
						);
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
							___nameGlobalsApp___,
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
												___nameGlobalsApp___,
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
						/// Collect the keys in a Set. This is ot automatically filter duplicates.
						const keys = ___namePrimordials___.NewSet([
							/// Always show access to all app-specific globals, safe globals,
							...___namePrimordials___.ReflectOwnKeys(___nameGlobalsApp___),
							...___namePrimordials___.ReflectOwnKeys(___nameGlobalsSafe___),

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
		const ___nameGlobalsAll___ = ___nameGlobalsImport___.all;

		/// Initialize the ambient context object.
		const ___nameAmbientContext___ = ___namePrimordials___.ObjectCreate(null);

		/// Attach sensitive global with a randomized name so breakins can't access.
		/// The script preamble we add will bind it to a locally scoped variable that
		/// has the original name.
		for (const [name, valueFn] of [
			["___nameGlobalThis___", () => ___nameGlobalThis___],
			["___nameGlobal___", () => ___nameGlobalThis___],

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
				/// First attach all original globals. Starting with the safe globals.
				...___namePrimordials___.ObjectEntries(___nameGlobalsSafe___),

				/// Finally add app globals, which override everything else.
				...___namePrimordials___.ObjectEntries(___nameGlobalsApp___),
			],
			([property, value], _index, _array) => {
				___namePrimordials___.ObjectDefineProperty(
					___nameAmbientContext___,
					property,
					___namePrimordials___.ObjectFreeze(
						___namePrimordials___.ObjectAssign(
							___namePrimordials___.ObjectCreate(null),
							{
								/// Configurable so that it can be overridden.
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
										___nameGlobalsApp___,
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
					),
				);
			},
		);

		return ___nameAmbientContext___;
	})();

	return [___nameGlobalThis___, ___nameAmbientContext___];
})();

/// Create a VM module that evaluates the source code in the shielded context.
const ___nameVmModule___ = (function () {
	const codeGenerationPolicy = ___namePrimordials___.ObjectFreeze(
		___namePrimordials___.ObjectAssign(
			___namePrimordials___.ObjectCreate(null),
			___valueCodeGenerationPolicy___,
		),
	);

	/// Create the options for the VM context for the VM instance.
	const ___nameVmContextOptions___ = ___namePrimordials___.ObjectFreeze(
		___namePrimordials___.ObjectAssign(
			___namePrimordials___.ObjectCreate(null),
			{
				/// Configure the code generation policy for the module.
				codeGeneration: codeGenerationPolicy,
			},
		),
	);

	/// Create the context for the VM instance.
	const ___nameVmContext___ = ___nameVm___.createContext(
		___nameAmbientContext___,
		___nameVmContextOptions___,
	);

	/// Create VM configuration object.
	const ___nameVmOptions___ = ___namePrimordials___.ObjectFreeze(
		___namePrimordials___.ObjectAssign(
			___namePrimordials___.ObjectCreate(null),
			{
				context: ___nameVmContext___,

				/// Configure vm to use the original file's filename.
				identifier: "___valueFileUrl___",
				filename: "___valueFileName___",

				/// Adjust line and column number based on the preamble
				lineOffset: ___valueLineOffset___,
				columnOffset: ___valueColumnOffset___,

				/// Configure the code generation policy for the module based on its
				/// permissions.
				contextCodeGeneration: codeGenerationPolicy,

				/// Define the 'import.meta' object
				initializeImportMeta(meta) {
					meta.url = "___valueFileUrl___";
					meta.dirname = "___valueDirname___";
					meta.filename = "___valueFilePath___";
				},

				/// Handle dynamic imports.
				importModuleDynamically: (specifier, _referencingModule, extra) => {
					return ___nameImport___(specifier, extra);
				},
			},
		),
	);

	/// Create a VM module from the source text of the target module.
	const ___nameVmModule___ = new ___nameVm___.SourceTextModule(
		`___valueCode___`,
		___nameVmOptions___,
	);

	return ___nameVmModule___;
})();

/// Create handler for static imports.
await ___nameVmModule___.link(async (specifier, referencingModule, extra) => {
	const resolved = await ___nameImport___(specifier, extra);

	const keys = ___namePrimordials___.ArrayFrom(
		resolved.default
			? ___namePrimordials___.NewSet([
					...___namePrimordials___.ObjectKeys(resolved),
					...___namePrimordials___.ObjectKeys(resolved.default),
				])
			: ___namePrimordials___.ObjectKeys(resolved),
	);

	return new ___nameVm___.SyntheticModule(
		keys,
		function () {
			if (resolved.default) {
				___namePrimordials___
					.ObjectEntries(resolved.default)
					.forEach(([name, value]) => {
						this.setExport(name, value);
					});
			}
			___namePrimordials___.ObjectEntries(resolved).forEach(([name, value]) => {
				this.setExport(name, value);
			});
		},
		___namePrimordials___.ObjectFreeze(
			___namePrimordials___.ObjectAssign(
				___namePrimordials___.ObjectCreate(null),
				{
					identifier: specifier,
					context: referencingModule.context,
				},
			),
		),
	);
});

/// Run the module.
await ___nameVmModule___.evaluate();

/// Bind exports from the evaluated module to the exports of the boxing module.
///
/// NOTE: 'module.namespace' is an object with a null-prototype so we are not
/// concerned about prototype pollution here.
___defaultExport___;
___classExports___;
___functionExports___;
___constExports___;
