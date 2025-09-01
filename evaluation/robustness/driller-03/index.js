if (!process.env.DANGEROUS_RUN_VULN) {
	console.log(
		"NOT RUNNING VULNERABLE CODE WITHOUT 'DANGEROUS_RUN_VULN' ENVIRONMENT VARIABLE",
	);
	process.exit(1);
}

// Original sample:
//   const { VM } = require(" vm2 ");
//   let vmInstance = new VM();
//   vmInstance.run(`
//   try {
//   	Object.defineProperty(RegExp.prototype, Symbol.match, {
//   		get: function () {
//   			new Error().stack;
//   			"x".match(/a/);
//   		},
//   	});
//   	"x".match(/a/);
//   } catch (e) {
//   	e.__proto__.__proto__.__proto__.polluted = 23;
//   }`);

try {
	Object.defineProperty(RegExp.prototype, Symbol.match, {
		get: function () {
			new Error().stack;
			"x".match(/a/);
		},
	});
	"x".match(/a/);
} catch (e) {
	e.__proto__.__proto__.__proto__.polluted = 23;
}

if (Object.prototype.polluted === 23) {
	process.exit(0);
} else {
	process.exit(82);
}
