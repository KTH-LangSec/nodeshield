const explanation = `
/// Helper module to create a version of 'node:module' with a 'createRequire'
/// function that is subject to the policy of the code that is using it.
`;

const shared = `
const helper = Object.freeze(
	Object.assign(
		Object.create(null),
		{
			createModuleExport: (mayRequire, handleViolation) => {
				return {
					...mod,
					createRequire: (filename) => {
						const _require = createRequire(filename);
						return function require(id) {
							if (!mayRequire(id)) {
								handleViolation(id);
							}

							return _require(id);
						};
					},
				};
			},
			isUnprivilegedBuiltin: (moduleName) => {
				/// return false for all capability-related built-in modules
				if (moduleName === "child_process" || moduleName === "node:child_process"
					|| moduleName === "crypto" || moduleName === "node:crypto"
					|| moduleName === "dgram" || moduleName === "node:dgram"
					|| moduleName === "dns" || moduleName === "node:dns"
					|| moduleName === "dns/promises" || moduleName === "node:dns/promises"
					|| moduleName === "fs" || moduleName === "node:fs"
					|| moduleName === "fs/promises" || moduleName === "node:fs/promises"
					|| moduleName === "http" || moduleName === "node:http"
					|| moduleName === "http2" || moduleName === "node:http2"
					|| moduleName === "https" || moduleName === "node:https"
					|| moduleName === "net" || moduleName === "node:net"
					|| moduleName === "os" || moduleName === "node:os"
					|| moduleName === "process" || moduleName === "node:process"
					|| moduleName === "tls" || moduleName === "node:tls"
					|| moduleName === "vm" || moduleName === "node:vm"
					|| moduleName === "worker_threads" || moduleName === "node:worker_threads"
				) {
					return false;
				}

				/// else return the answer according to Node.js
				return isBuiltin(moduleName);
			},
		},
	),
);
`;

const cjs = `${explanation}

const mod = require("node:module");

const createRequire = mod.createRequire;
const isBuiltin = mod.isBuiltin;

${shared}

module.exports = helper;
`;

const esm = `${explanation}

import * as mod from "node:module";

const createRequire = mod.createRequire;
const isBuiltin = mod.isBuiltin;

${shared}

export const createModuleExport = helper.createModuleExport;
export const isUnprivilegedBuiltin = helper.isUnprivilegedBuiltin;
`;

export function createModuleShimCodeCjs() {
	return cjs;
}

export function createModuleShimCodeEsm() {
	return esm;
}
