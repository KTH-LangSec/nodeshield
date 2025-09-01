import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";
import { argv } from "node:process";

const dependency_changing_commits_only = true;

//
const index = argv[2];
const readCbom = (i) => {
	const filepath = path.join(".", ".results", index, `${i}-cbom.json`);
	if (!existsSync(filepath)) return undefined;

	const raw = readFileSync(filepath, { encoding: "utf-8" });
	const cbom = JSON.parse(raw);
	return cbom;
};

//
let i = 1;
let cbom;
let next;

console.log("Computing diffs...");
let diffs = [];
while ((cbom = readCbom(i))) {
	if (next) {
		//
		const added = {};
		for (const key of Object.keys(next)) {
			if (!Object.hasOwn(cbom, key)) added[key] = next[key];
		}

		//
		const removed = {};
		for (const key of Object.keys(cbom)) {
			if (!Object.hasOwn(next, key)) removed[key] = cbom[key];
		}

		//
		const changed = {};
		for (const key of Object.keys(cbom)) {
			if (!Object.hasOwn(next, key)) continue;

			for (const a of cbom[key]) {
				let found = false;
				for (const b of next[key]) {
					if (a === b) {
						found = true;
						break;
					}
				}

				if (!found) {
					if (!changed[key]) changed[key] = [];
					changed[key].push(a);
				}
			}
		}

		//
		for (const a of Object.keys(added)) {
			const na = a.substring(0, a.lastIndexOf("@"));

			let found = null;
			for (const r of Object.keys(removed)) {
				const nr = r.substring(0, r.lastIndexOf("@"));
				if (na === nr) {
					found = { a, r };
					break;
				}
			}

			if (found !== null) {
				const { a, r } = found;

				const before = removed[r];
				delete removed[r];

				const after = added[a];
				delete added[a];

				const key = na;
				for (const a of before) {
					let found = false;
					for (const b of after) {
						if (a === b) {
							found = true;
							break;
						}
					}

					if (!found) {
						if (!changed[key]) changed[key] = [];
						changed[key].push(a);
					}
				}
			}
		}

		diffs.push({ added, removed, changed });
	}

	next = cbom;
	i++;
}

// We MUST do this before pruning so that we look at commits that changed the set
// of dependencies rather than the set of commits that changed capabilities.
if (dependency_changing_commits_only) {
	diffs = diffs.filter(
		(diff) =>
			Object.keys(diff.added).length +
				Object.keys(diff.removed).length +
				Object.keys(diff.changed).length >
			0,
	);
}

// Prune out cases where no capabilities were added or removed.
for (const diff of diffs) {
	for (const key of Object.keys(diff.added)) {
		if (diff.added[key].length === 0) delete diff.added[key];
	}

	for (const key of Object.keys(diff.removed)) {
		if (diff.removed[key].length === 0) delete diff.removed[key];
	}

	for (const key of Object.keys(diff.changed)) {
		if (diff.changed[key].length === 0) delete diff.changed[key];
	}
}

console.log(/* newline */);
console.log("=== DIFFS ===");
diffs.forEach((diff) => console.log(diff));

const numberTotalPerDiff = diffs.map(
	({ added, removed, changed }) =>
		Object.values(added).reduce((a, x) => a + x.length, 0) +
		Object.values(removed).reduce((a, x) => a + x.length, 0) +
		Object.values(changed).reduce((a, x) => a + x.length, 0),
);
const numberTotal = numberTotalPerDiff.reduce((a, x) => a + x, 0);

const numberToReviewPerDiff = diffs.map(
	({ added, changed }) =>
		Object.values(added).reduce((a, x) => a + x.length, 0) +
		Object.values(changed).reduce((a, x) => a + x.length, 0),
);
const numberToReview = numberToReviewPerDiff.reduce((a, x) => a + x, 0);

const numberChangedPerDiff = diffs.map(({ changed }) =>
	Object.values(changed).reduce((a, x) => a + x.length, 0),
);
const numberChanged = numberChangedPerDiff.reduce((a, x) => a + x, 0);

console.log(/* newline */);
console.log("=== NUMBERS ===");
console.log(
	"Total number of capability changes:",
	numberTotal,
	"| average:",
	numberTotal / numberTotalPerDiff.length,
	"\nper diff:",
	numberTotalPerDiff.join(", "),
);

console.log(/* newline */);
console.log(
	"Total number of reviewable changes:",
	numberToReview,
	"| average:",
	numberToReview / numberToReviewPerDiff.length,
	"\nper diff:",
	numberToReviewPerDiff.join(", "),
);

console.log(/* newline */);
console.log(
	"Total number of package capability changes:",
	numberChanged,
	"| average:",
	numberChanged / numberChangedPerDiff.length,
	"\nper diff:",
	numberChangedPerDiff.join(", "),
);
