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
			"Code generation from strings disallowed for this context" ||
		error.message === "process is not defined"
	) {
		process.exit(82);
	}

	process.exit(1);
});

this.constructor.constructor("return process")().exit();
