const explanation = `
/// Re-export required functions from 'node:vm' through a frozen object without
/// a prototype to prevent modifications to the 'node:vm' export from affecting
/// the host.
`;

const cjs = `${explanation}

const path = require("node:path");

const hostPath = Object.freeze(
	Object.assign(
		Object.create(null),
		{
			resolve: path.resolve,
		},
	),
);

module.exports = hostPath;
`;

const esm = `${explanation}

import * as path from "node:path";

export const hostPath = Object.freeze(
	Object.assign(
		Object.create(null),
		{
			resolve: path.resolve,
		},
	),
);
`;

export function createPathShimCodeCjs() {
	return cjs;
}

export function createPathShimCodeEsm() {
	return esm;
}
