const explanation = `
/// Re-export required functions from 'node:vm' through a frozen object without
/// a prototype to prevent modifications to the 'node:vm' export from affecting
/// the host.
`;

const cjs = `${explanation}

const vm = require("node:vm");

const hostVm = Object.freeze(
	Object.assign(
		Object.create(null),
		{
			createContext: vm.createContext,
			runInContext: vm.runInContext,
		},
	),
);

module.exports = hostVm;
`;

const esm = `${explanation}

import * as vm from "node:vm";

export const hostVm = Object.freeze(
	Object.assign(
		Object.create(null),
		{
			createContext: vm.createContext,
			SourceTextModule: vm.SourceTextModule,
			SyntheticModule: vm.SyntheticModule,
		},
	),
);
`;

export function createVmShimCodeCjs() {
	return cjs;
}

export function createVmShimCodeEsm() {
	return esm;
}
