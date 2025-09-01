import * as cp from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { performance } from "node:perf_hooks";
import * as process from "node:process";
import * as url from "node:url";

import * as args from "./args.js";
import * as boxes from "./box/index.js";
import * as policy from "./policy.js";
import * as sbom from "./sbom.js";

export const NODE_CLI_OPTIONS = ({ disableEval, stackSize }) => [
	/// Configure the Node.js permission system
	"--experimental-vm-modules",

	/// Configure stack size if necessary
	...(stackSize ? [`--stack-size=${stackSize}`] : []),

	/// Disable code generation from strings in the boxing context. This prevents
	/// sandbox breakouts. Instantiating a VM still allows for enabling dynamic
	/// code generation.
	/// This flag can be disabled because it does break some niche patterns such
	/// as dynamic code evaluation using 'Function.constructor(...)'.
	...(disableEval ? ["--disallow-code-generation-from-strings"] : []),
];

function main(options) {
	const startTime = performance.now();

	const srcSbomPath = path.resolve(options.sbomFile);
	const srcSbomRaw = fs.readFileSync(srcSbomPath, { encoding: "utf-8" });
	const sbomData = sbom.parse(srcSbomRaw, {
		hierarchyOptional: options.hierarchyOptional,
	});

	let cbomData = null;
	if (options.cbomFile) {
		const srcCbomPath = path.resolve(options.cbomFile);
		const srcCbomRaw = fs.readFileSync(srcCbomPath, { encoding: "utf-8" });
		cbomData = JSON.parse(srcCbomRaw);
	}

	const irPolicy = policy.from(sbomData, cbomData);

	if (options.cbomOutput !== null) {
		const capabilities = Object.entries(irPolicy)
			.map(([name, policy]) => ({
				id: policy.id,
				capabilities: policy.capabilities,
			}))
			.reduce((capabilities, entry) => {
				capabilities[entry.id] = entry.capabilities;
				return capabilities;
			}, {});
		fs.writeFileSync(
			options.cbomOutput,
			JSON.stringify(capabilities, null, 2) + "\n",
		);
	}

	const { boxedAppDir } = boxes.generate(irPolicy, options.strategy);

	const endTime = performance.now();
	if (options.debug) {
		const elapsedTime = endTime - startTime;
		console.log(`setup took ${elapsedTime} ms`);
	}

	const command = "node";
	const args = [
		...NODE_CLI_OPTIONS({
			disableEval: !options.enableCodeGeneration,
			stackSize: options.stackSize,
		}),
		path.resolve(boxedAppDir, options.entryPoint[0]),
		...options.entryPoint.slice(1 /*, end*/),
	];
	if (options.run) {
		const proc = cp.spawn(command, args, {
			env: process.env,
			stderr: "inherit",
			stdio: "inherit",
			stdout: "inherit",
		});

		proc.on("close", (code) => process.exit(code));
	} else {
		console.log("Build output:", boxedAppDir);
		console.log("Run:", `\`${command} ${args.join(" ")}\``);
	}
}

if (process.argv[1] === url.fileURLToPath(import.meta.url)) {
	let options;
	try {
		options = args.parse(process.argv);
	} catch (error) {
		console.error(error);
		process.exit(2);
	}

	try {
		main(options);
	} catch (error) {
		console.error(error);
		process.exit(1);
	}
}
