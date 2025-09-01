import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import * as names from "./names.js";
import {
	globalsProxy,
	createModuleShimCodeCjs,
	createModuleShimCodeEsm,
	createPathShimCodeCjs,
	createPathShimCodeEsm,
	createVmShimCodeCjs,
	createVmShimCodeEsm,
} from "./internals/index.js";
import { noisyName, policyToPermissions } from "./misc.js";
import { generateBoxCjs } from "./cjs/index.js";
import { generateBoxMjs } from "./esm/index.js";

export function generate(policy, strategy) {
	const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), "s2s-"));
	const nameGenerator = names.create(names.generators.random);

	const dirs = {
		root: path.resolve("."),
		out: path.resolve(outRoot, "app"),
		hidden: generateHelpers(outRoot, nameGenerator),
	};

	Object.entries(policy).forEach(tmp(dirs, strategy, nameGenerator));

	return {
		boxedAppDir: dirs.out,
	};
}

function generateHelpers(root, nameGenerator) {
	const dir = path.resolve(root, noisyName("."));
	fs.mkdirSync(dir, { recursive: true });

	const moduleCjs = path.resolve(dir, "module.cjs");
	const moduleMjs = path.resolve(dir, "module.mjs");
	fs.writeFileSync(
		moduleCjs,
		createModuleShimCodeCjs({ names: nameGenerator }),
	);
	fs.writeFileSync(
		moduleMjs,
		createModuleShimCodeEsm({ names: nameGenerator }),
	);

	const pathCjs = path.resolve(dir, "path.cjs");
	const pathMjs = path.resolve(dir, "path.mjs");
	fs.writeFileSync(pathCjs, createPathShimCodeCjs({ names: nameGenerator }));
	fs.writeFileSync(pathMjs, createPathShimCodeEsm({ names: nameGenerator }));

	const vmCjs = path.resolve(dir, "vm.cjs");
	const vmMjs = path.resolve(dir, "vm.mjs");
	fs.writeFileSync(vmCjs, createVmShimCodeCjs({ names: nameGenerator }));
	fs.writeFileSync(vmMjs, createVmShimCodeEsm({ names: nameGenerator }));

	// NOTE: cannot generate both CJS and MJS because they would be evaluated
	// both, leading to the latter erroring because all the globals have already
	// been removed.
	const globalsCjs = path.resolve(dir, "globals.cjs");
	const globalsCode = globalsProxy({
		names: nameGenerator,
		esm: false,
	});
	fs.writeFileSync(globalsCjs, globalsCode);

	return dir;
}

function tmp(dirs, strategy, nameGenerator) {
	return ([scope, policy]) => {
		for (const file of policy.files) {
			const ogFilePath = path.resolve(dirs.root, file);
			const ogDirPath = path.dirname(ogFilePath);

			const outFilePath = path.resolve(dirs.out, file);
			const outDirPath = path.dirname(outFilePath);

			try {
				fs.mkdirSync(outDirPath, { recursive: true });
			} catch (_) {}

			const extension = path.extname(file);
			if (extension === ".json") {
				fs.copyFileSync(ogFilePath, outFilePath);
				continue;
			}

			const paths = {
				ogFile: file,
				ogFileAbs: ogFilePath,
				ogDirAbs: ogDirPath,
				hiddenRel: path.relative(outDirPath, dirs.hidden),
				outDirAbs: ogDirPath.replace(dirs.root, dirs.out),
				inRoot: dirs.root,
				outRoot: dirs.out,
			};

			const src = fs.readFileSync(paths.ogFileAbs, { encoding: "utf-8" });

			const permissions = policyToPermissions(file, policy, dirs.out);
			const type = deriveType(ogFilePath);
			if (type === TYPE_CJS) {
				const boxScript = generateBoxCjs({
					names: nameGenerator,
					src,
					paths,
					permissions,
					strategy,
					file,
				});
				fs.writeFileSync(outFilePath, boxScript);
			} else {
				const boxScript = generateBoxMjs({
					names: nameGenerator,
					src,
					paths,
					permissions,
					strategy,
					file,
				});
				fs.writeFileSync(outFilePath, boxScript);
			}
		}
	};
}

const TYPE_CJS = 0,
	TYPE_ESM = 1;
function deriveType(filepath) {
	const extname = path.extname(filepath);
	if (extname === ".cjs") {
		return TYPE_CJS;
	} else if (extname === ".mjs") {
		return TYPE_ESM;
	}

	let workingDir = path.dirname(filepath);
	while (true) {
		const entries = fs.readdirSync(workingDir);
		if (entries.includes("package.json")) {
			break;
		}

		const newWorkingDir = path.resolve(workingDir, "..");
		if (workingDir === newWorkingDir) {
			throw new Error("unimplemented");
		}

		workingDir = newWorkingDir;
	}

	const manifestPath = path.resolve(workingDir, "package.json");
	let manifest;
	try {
		const manifestRaw = fs.readFileSync(manifestPath, { encoding: "utf-8" });
		manifest = JSON.parse(manifestRaw);
	} catch {
		console.log("[D] failed to parse manifest at", manifestPath);
		return TYPE_CJS;
	}

	if (!manifest.type) {
		return TYPE_CJS;
	}

	switch (manifest.type) {
		case "module":
			return TYPE_ESM;
		case "commonjs":
			return TYPE_CJS;
		default:
			console.error(`Unknown type "${manifest.type}"`);
			return TYPE_CJS;
	}
}
