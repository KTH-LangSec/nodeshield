import { STRATEGIES } from "./policy.js";

/**
 * Parse the arguments vector for the CLI into an options object.
 *
 * @param {string[]} argv The arguments vector provided.
 * @returns The parsed options from the arguments vector.
 */
export function parse(argv) {
	let args = argv.slice(
		argv[0].endsWith("node") ? 2 : 1,
		/* end */
	);

	let entryPoint = [];
	const splitter = args.indexOf("--");
	if (splitter !== -1) {
		entryPoint = args.splice(splitter + 1 /*end*/);
		args = args.splice(0, splitter);
	}

	const parsed = {
		entryPoint,

		// initialize to defaults
		cbomFile: null,
		sbomFile: DEFAULT_SBOM_FILE,
		strategy: DEFAULT_STRATEGY,

		cbomOutput: null,

		hierarchyOptional: false,
		showCapabilities: false,

		help: false,
		debug: false,
		run: true,

		enableCodeGeneration: false,
		stackSize: null,
	};

	for (let i = 0; i < args.length; i++) {
		switch (args[i]) {
			case FLAG_CBOM_INPUT: {
				if (args.length - 1 == i)
					throw new Error(`missing value for ${args[i]}`);
				const value = args[++i];
				parsed.cbomFile = value;
				break;
			}
			case FLAG_CBOM_OUTPUT: {
				if (args.length - 1 == i)
					throw new Error(`missing value for ${args[i]}`);
				const value = args[++i];
				parsed.cbomOutput = value;
				break;
			}
			case FLAG_SBOM_INPUT: {
				if (args.length - 1 == i)
					throw new Error(`missing value for ${args[i]}`);
				const value = args[++i];
				parsed.sbomFile = value;
				break;
			}
			case FLAG_NODE_STACK_SIZE: {
				if (args.length - 1 == i)
					throw new Error(`missing value for ${args[i]}`);
				const value = args[++i];
				parsed.stackSize = value;
				break;
			}
			case FLAG_STRATEGY: {
				if (args.length - 1 == i)
					throw new Error(`missing value for ${args[i]}`);
				const value = args[++i];
				switch (value) {
					case "exit":
						parsed.strategy = STRATEGIES.exit;
						break;
					case "log":
						parsed.strategy = STRATEGIES.log;
						break;
					case "throw":
						parsed.strategy = STRATEGIES.throw;
						break;
					default:
						throw new Error(`Unknown strategy '${value}`);
				}
				break;
			}

			case FLAG_HELP: {
				printHelpAndExit();
				parsed.help = true;
				break;
			}
			case FLAG_DEBUG: {
				parsed.debug = true;
				break;
			}
			case FLAG_HIERARCHY_OPTIONAL: {
				parsed.hierarchyOptional = true;
				break;
			}
			case FLAG_BUILD_ONLY: {
				parsed.run = false;
				break;
			}
			case FLAG_ENABLE_CODE_GENERATION: {
				parsed.enableCodeGeneration = true;
				break;
			}

			default: {
				if (args[i].startsWith("--"))
					throw new Error(`unknown flag ${args[i]}`);
				parsed.entryPoint.push(args[i]);
			}
		}
	}

	if (parsed.entryPoint.length === 0) {
		throw new Error("no entrypoint specified");
	}

	return parsed;
}

export const FLAG_BUILD_ONLY = "--build-only";
export const FLAG_DEBUG = "--debug";
export const FLAG_HELP = "--help";
export const FLAG_SBOM_INPUT = "--sbom";
export const FLAG_CBOM_INPUT = "--cbom";
export const FLAG_CBOM_OUTPUT = "--cbom-output";
export const FLAG_STRATEGY = "--strategy";
export const FLAG_HIERARCHY_OPTIONAL = "--hierarchy-optional";
export const FLAG_NODE_STACK_SIZE = "--node-stack-size";
export const FLAG_ENABLE_CODE_GENERATION =
	"--enable-code-generation-from-strings";

const DEFAULT_CBOM_FILE = "cbom.json";
const DEFAULT_SBOM_FILE = "sbom.json";
const DEFAULT_STRATEGY = STRATEGIES.throw;

const RAW_STRATEGIES = ["exit", "log", "throw"];

function printHelpAndExit() {
	console.log(`
\t[${FLAG_HELP}]
\t[${FLAG_SBOM_INPUT} sbom-spdx.json]
\t[${FLAG_CBOM_INPUT} capabilities.json]

Options:
\t${FLAG_HELP}\t\tPrint this help message.
\t${FLAG_SBOM_INPUT}\t\tSpecify the SBOM file. Supported formats are: SPDX.
\t\t\t  DEFAULT=${DEFAULT_SBOM_FILE}
\t${FLAG_CBOM_INPUT}\t\tSpecify the CapabilityBOM file.
\t\t\t  Optional
\t${FLAG_STRATEGY}\tWhat to do when the policy is violated: ${RAW_STRATEGIES}.
\t\t\t  DEFAULT=${DEFAULT_STRATEGY}`);
	process.exit(2);
}
