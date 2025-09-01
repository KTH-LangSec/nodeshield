import { FLAG_HIERARCHY_OPTIONAL } from "./args.js";

/**
 * Parse the given SBOM into normalized data usable by this project.
 *
 * @param {string} rawSbom The SBOM as a raw string.
 * @param {object} opts Configuration options.
 * @returns {SBOM} Parsed SBOM data.
 */
export function parse(rawSbom, options) {
	const sbom = parseRawSbom(rawSbom);
	const { format, version } = getSbomFormat(sbom);

	switch (`${format}-${version}`) {
		// FUTURE: Add SPDX support
		case "CycloneDX-1.5":
			return parseCycloneDxSbom(sbom, options);
		default:
			throw new Error(
				`SBOM format '${format}' (version: ${version}) not supported`,
			);
	}
}

const FIELD_NAME = "name";
const FIELD_ID = "id";
const FIELD_DEPENDS_ON = "dependsOn";

function parseRawSbom(rawSbom) {
	try {
		return JSON.parse(rawSbom);
	} catch (error) {
		throw new Error(`SBOM must be JSON (error: ${error})`);
	}
}

function getSbomFormat(sbom) {
	const format = sbom.bomFormat;
	const version = sbom.specVersion;
	return { format, version };
}

function parseCycloneDxSbom(sbom, options) {
	const extractPackageId = (pkg) => pkg["bom-ref"];
	const extractPackageName = (pkg) => pkg.name;
	const extractRelationId = (rel) => rel.ref;
	const extractRelationDependsOn = (rel) => rel.dependsOn;

	const allComponentsInTheSbom = [sbom.metadata.component, ...sbom.components];

	const ownId = extractPackageId(sbom.metadata.component);

	const components = allComponentsInTheSbom.map((pkg) => ({
		[FIELD_NAME]: extractPackageName(pkg),
		[FIELD_ID]: extractPackageId(pkg),
	}));

	let hierarchy;
	if (Array.isArray(sbom.dependencies)) {
		hierarchy = sbom.dependencies.map((rel) => ({
			[FIELD_ID]: extractRelationId(rel),
			[FIELD_DEPENDS_ON]: extractRelationDependsOn(rel),
		}));
	} else if (options.hierarchyOptional) {
		console.warn(
			"[WARNING] Dependency hierarchy missing from SBOM. Falling back to allowing all dependencies to import each other.",
		);
		hierarchy = allComponentsInTheSbom.map((pkgA) => ({
			[FIELD_ID]: extractPackageId(pkgA),
			[FIELD_DEPENDS_ON]: sbom.components
				.filter((pkgB) => extractPackageId(pkgA) !== extractPackageId(pkgB))
				.map((pkgB) => extractPackageId(pkgB)),
		}));
	} else {
		throw new Error(
			`Dependency hierarchy missing from SBOM. (DANGEROUS: use ${FLAG_HIERARCHY_OPTIONAL} to run without a dependency hierarchy.)`,
		);
	}

	return { components, hierarchy, ownId };
}

/**
 * @typedef SBOM
 * @property {Component[]} components
 * @property {Hierarchy[]} hierarchy
 * @property {ComponentId} ownId
 */

/**
 * @typedef Component
 * @property {ComponentName} name
 * @property {ComponentId} id
 */

/**
 * @typedef Hierarchy
 * @property {ComponentId} id
 * @property {ComponentId[]} dependsOn
 */

/** @typedef {string} ComponentName */
/** @typedef {string} ComponentId */
