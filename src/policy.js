import * as fs from "node:fs";
import * as path from "node:path";

import * as capabilities from "./capabilities.js";

/**
 * @param {SBOM} sbom
 * @param {CBOM} cbom
 */
export function from(sbom, cbom) {
	const root = "./";

	const projectCapabilities = getCapabilitiesForPackageFiles(
		root,
		sbom.ownId,
		cbom,
	);

	const policy = {
		[root]: {
			id: sbom.ownId,
			node: [...policyForCapabilities(projectCapabilities, sbom.ownId)],
			capabilities: projectCapabilities,
			packages: policyForDependentModules(sbom.ownId, {
				components: sbom.components,
				hierarchy: sbom.hierarchy,
			}),
			files: policyForPackageFiles(root),
		},
	};

	sbom.hierarchy
		.find((c) => c.id === sbom.ownId)
		.dependsOn // handle transitive file system hierarchies
		.flatMap((pkgId) =>
			policyForPackage({
				base: cwd,
				components: sbom.components,
				hierarchy: sbom.hierarchy,
				pkg: sbom.components.find((pkg) => pkg.id === pkgId),
				policy,
				cbom,
			}),
		);

	return policy;
}

function policyForDependentModules(ownId, { components, hierarchy }) {
	const ownHierarchy = hierarchy.find((entry) => entry.id === ownId);

	return components
		.filter((pkg) => ownHierarchy.dependsOn.includes(pkg.id) || pkg.id == ownId)
		.filter((pkg) =>
			Object.values(capabilities.Map)
				.flatMap((ids) => ids)
				.every((id) => !pkg.id.startsWith(`${id}@`)),
		)
		.map((pkg) => pkg.name);
}

function policyForPackageFiles(dirPath, capabilities) {
	return walk(dirPath, stdFilter)
		.filter(isAllowedFileType({ addons: capabilities?.includes("addon") }))
		.map(normalizePath);
}

function policyForPackage({ base, pkg, policy, components, hierarchy, cbom }) {
	const pkgPath = path.resolve(base, "node_modules", pkg.name);
	if (!fs.existsSync(pkgPath)) {
		// bubble up in case its higher up in the hierarchy
		return [pkg];
	}

	const policyId = `${normalizePath(pkgPath)}/`;
	if (Object.hasOwn(policy, policyId)) {
		// avoid recomputing the policy
		return [];
	}

	const pkgCapabilities = getCapabilitiesForPackageFiles(pkgPath, pkg.id, cbom);
	policy[policyId] = {
		id: pkg.id,
		node: [...policyForCapabilities(pkgCapabilities, pkg.id)],
		capabilities: pkgCapabilities,
		packages: policyForDependentModules(pkg.id, { components, hierarchy }),
		files: policyForPackageFiles(pkgPath, pkgCapabilities),
	};

	return (
		hierarchy
			.find((c) => c.id === pkg.id)
			.dependsOn // handle transitive file system hierarchies
			.flatMap((pkgId) =>
				policyForPackage({
					base: pkgPath,
					pkg: components.find((pkg) => pkg.id === pkgId),
					policy,
					components,
					hierarchy,
					cbom,
				}),
			)

			// handle cases where deeper dependencies depend on dependencies higher up
			.map((pkg) => pkg.id)
			.flatMap((pkgId) =>
				policyForPackage({
					base,
					pkg: components.find((c) => c.id === pkgId),
					policy,
					components,
					hierarchy,
					cbom,
				}),
			)
	);
}

function policyForCapabilities(capabilityList, id) {
	try {
		return capabilityList.flatMap((capability) => capabilities.Map[capability]);
	} catch (error) {
		console.log("no capabilities found for:", id);
		process.exit(1);
	}
}

// --- HELPERS --- //

const stdFilter = (entry) =>
	path.basename(entry) === "node_modules" || path.basename(entry) === ".git";

function getCapabilitiesForPackageFiles(dirPath, id, cbom) {
	if (cbom) {
		return cbom[id];
	}

	const files = walk(dirPath, stdFilter);

	const hasAddon =
		files.findIndex((file) => path.extname(file) === ".node") !== -1;
	const base = hasAddon ? new Set([capabilities.Names.ADDON]) : new Set();

	const tmp = files
		.filter(isAllowedFileType({ addons: false }))
		.reduce((capabilities, filePath) => {
			const content = fs.readFileSync(filePath).toString();
			for (const capability of getCapabilitiesForFile(content)) {
				capabilities.add(capability);
			}

			return capabilities;
		}, base);

	return Array.from(tmp);
}

function getCapabilitiesForFile(content) {
	let match = null;
	const fileCapabilities = new Set();

	{
		const importExpr = /import\s.+?\sfrom\s+(?:"|')([^"']+)(?:"|')/g;
		while ((match = importExpr.exec(content)) !== null) {
			let capability = null;
			for (const [c, imports] of Object.entries(capabilities.Map)) {
				if (imports.includes(match[1])) {
					capability = c;
					break;
				}
			}

			if (capability !== null) {
				fileCapabilities.add(capability);
			}
		}
	}

	{
		const importExpr = /import\s+(?:"|')([^"']+)(?:"|')/g;
		while ((match = importExpr.exec(content)) !== null) {
			let capability = null;
			for (const [c, imports] of Object.entries(capabilities.Map)) {
				if (imports.includes(match[1])) {
					capability = c;
					break;
				}
			}

			if (capability !== null) {
				fileCapabilities.add(capability);
			}
		}
	}

	{
		const requireExpr = /require\s*\(\s*(?:"|')([^"']+)(?:"|')\s*\)/g;
		while ((match = requireExpr.exec(content)) !== null) {
			let capability = null;
			for (const [c, imports] of Object.entries(capabilities.Map)) {
				if (imports.includes(match[1])) {
					capability = c;
					break;
				}
			}

			if (capability !== null) {
				fileCapabilities.add(capability);
			}
		}
	}

	{
		// Based on <https://nodejs.org/api/addons.html>
		const addonExpr = /require\s*\(\s*(?:"|')([^"']+).node(?:"|')\s*\)/g;
		while ((match = addonExpr.exec(content)) !== null) {
			fileCapabilities.add(capabilities.Names.ADDON);
		}
	}

	{
		const expr = /[^a-z]fetch[^a-z]/gi;
		if (expr.test(content)) {
			fileCapabilities.add(capabilities.Names.NETWORK);
		}
	}

	{
		const expr = /[^a-z]process[^a-z]/gi;
		if (expr.test(content)) {
			fileCapabilities.add(capabilities.Names.SYSTEM);
		}
	}

	{
		const expr = /[^a-z]eval[^a-z]/gi;
		if (expr.test(content)) {
			fileCapabilities.add(capabilities.Names.EXECUTE_CODE);
		}
	}

	return fileCapabilities;
}

function walk(node, skip) {
	if (skip(node)) {
		return [];
	}

	try {
		if (fs.statSync(node).isFile()) {
			return [node];
		} else {
			return fs
				.readdirSync(node)
				.map((entry) => path.resolve(node, entry))
				.flatMap((entry) => walk(entry, skip));
		}
	} catch {
		console.log("[D] failed to walk", node);
		return [];
	}
}

const ALLOWED_FILE_TYPES = [
	"",

	// JavaScript
	".js",
	".cjs",
	".mjs",
	".njs",

	// JSON
	".json",
];

function isAllowedFileType({ addons }) {
	return (filePath) => {
		const extension = path.extname(filePath);
		if (addons && extension === ".node") {
			return true;
		}

		return ALLOWED_FILE_TYPES.includes(extension);
	};
}

function normalizePath(fullPath) {
	return fullPath.replace(cwd, ".");
}

const cwd = path.resolve(".");

/**
 * @typedef {Symbol} Strategy
 */

/**
 * @type {Object<"exit" | "log" | "throw", Strategy>}
 */
export const STRATEGIES = Object.freeze({
	/**
	 * With the 'exit' strategy a policy violation will cause the application to
	 * exit immediately.
	 */
	exit: Symbol("exit"),

	/**
	 * With the 'log' strategy a policy violation will be logged only, it is not
	 * prevented and the program continues executing as it should.
	 */
	log: Symbol("log"),

	/**
	 * With the throw strategy a policy violation causes an immediate runtime
	 * error.
	 *
	 * Note that since this is a JavaScript exception, the contextified code could
	 * catch policy violations and handle them gracefully.
	 */
	throw: Symbol("throw"),
});

/** @typedef {import("./sbom.js").SBOM} SBOM */
