if (!process.env.DANGEROUS_RUN_VULN) {
	console.log(
		"NOT RUNNING VULNERABLE CODE WITHOUT 'DANGEROUS_RUN_VULN' ENVIRONMENT VARIABLE",
	);
	process.exit(1);
}

const fs = require("fs");
const pathM = require("path");
const resize = require("mobile-icon-resizer");
const path = "./mobile-icon-resizer";
file_exist = fs.existsSync(path);
console.log("a", file_exist);
let options = {
	config: pathM.resolve(__dirname, "./config"),
};
try {
	resize(options, function (err) {});
} catch (e) {
	console.log(e);
}
file_exist = fs.existsSync(path);
setTimeout(() => {
	fs.unlink(path, function (err) {});
	console.log("b", file_exist);

	if (file_exist) {
		process.exit(0);
	} else {
		process.exit(82);
	}
}, 1);
