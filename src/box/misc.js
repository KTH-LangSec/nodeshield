import * as path from "node:path";

import * as capabilities from "../capabilities.js";
import * as random from "./random.js";
import { STRATEGIES } from "../policy.js";

export function noisyName(id) {
	if (!id) {
		throw new Error(
			"id required as it gives better guarantees variable names are unique",
		);
	}

	return id + "$" + random.hex();
}

export function codeGenerationPolicy({ permissions, strategy }) {
	if (permissions.code || strategy === STRATEGIES.log) {
		return "{strings: true, wasm: true}";
	} else {
		return "{strings: false, wasm: false}";
	}
}

export function policyToPermissions(file, policy, out) {
	const context = Object.assign(Object.create(null), {
		command: false,
		code: false,
		crypto: false,
		network: false,
		process: false,

		import: Object.assign(Object.create(null), {
			packages: [...policy.node, ...policy.packages],
			files: Array.from(
				new Set([
					...policy.files
						.map((to) => path.join(out, to))
						.flatMap((file) => [
							file,
							file.replace(new RegExp(`${path.extname(file)}$`), ""), // file w/o extension
							path.dirname(file), // directories (which imports index.js)
						]),
				]),
			),
		}),
	});

	if (policy.capabilities.includes(capabilities.Names.CRYPTOGRAPHY)) {
		context.crypto = true;
		context.import.packages.push("crypto", "node:crypto");
	}

	if (policy.capabilities.includes(capabilities.Names.EXECUTE_COMMAND)) {
		context.command = true;
	}

	if (policy.capabilities.includes(capabilities.Names.EXECUTE_CODE)) {
		context.code = true;
		context.import.packages.push("vm", "node:vm");
	}

	if (policy.capabilities.includes(capabilities.Names.NETWORK)) {
		context.network = true;
		context.import.packages.push(
			"node:dns",
			"dns",
			"node:dns/promises",
			"dns/promises",
			"node:http",
			"http",
			"node:https",
			"https",
			"node:http2",
			"http2",
			"node:net",
			"net",
		);
	}

	if (policy.capabilities.includes(capabilities.Names.SYSTEM)) {
		context.process = true;
		context.import.packages.push("node:process", "process");
	}

	return context;
}
