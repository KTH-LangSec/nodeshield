import { performance } from "node:perf_hooks";
import { argv, exit } from "node:process";

const port = argv[2];
const endpoint = argv[3];
const threshold_ms = 1_000;
const tries = 5;

if (port === undefined || endpoint === undefined) {
	console.log("usage: node test-throughput.mjs <port> <endpoint>");
	console.log("must provide a port and point");
	exit(2);
}

process.on("uncaughtException", (error) => {
	console.log("Result:", "unexpected error, no definitive result");
	console.error(error);
	process.exit(1);
});

let increment = 1_000;
let attempt = 0;
for (let n = increment; true; n += increment) {
	const start = performance.now();

	let ps = [];
	for (let i = 0; i < n; i++) {
		const p = fetch(`http://localhost:${port}/${endpoint}`).then((response) =>
			response.blob(),
		);
		ps.push(p);
	}

	await Promise.all(ps);

	const end = performance.now();
	const duration = end - start;
	console.log(
		"n =",
		n,
		"| attempt =",
		`${attempt}/${tries}`,
		"| duration =",
		duration / 1000,
		"seconds",
	);

	if (duration >= threshold_ms) {
		if (attempt < tries) {
			n -= increment;
			attempt += 1;
		} else if (increment > 10) {
			n -= increment;
			increment = Math.round(increment / 10);
			attempt = 0;
		} else {
			console.log("Result:", `handling ${n} request takes >=${threshold_ms}ms`);
			break;
		}
	} else {
		attempt = 0;
	}

	await sleep(10);
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
