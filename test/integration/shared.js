import * as assert from "node:assert";

import stripAnsi from "strip-ansi";

function trimLeft(text) {
	return text
		.split(/\n/g)
		.map((line) => line.trimLeft())
		.join("\n");
}

export function assertSuccess(result) {
	assert.equal(
		result.success,
		true,
		trimLeft(`Box failed unexpected.

		STDOUT:
		${result.stdout}

		STDERR:
		${result.stderr}`),
	);
}

export function assertFailure(result) {
	assert.equal(
		result.success,
		false,
		`Box succeeded unexpected.

		STDOUT:
		${result.stdout}

		STDERR:
		${result.stderr}`,
	);
}

export function assertStdout(result, expected) {
	if (typeof expected === "string") {
		if (expected === "") {
			assert.equal(stripAnsi(result.stdout), "");
		} else {
			assert.equal(stripAnsi(result.stdout), `${expected}\n`);
		}
	} else {
		assert.match(stripAnsi(result.stdout), expected);
	}
}

export function assertStderr(result, expected) {
	if (typeof expected === "string") {
		if (expected === "") {
			assert.equal(stripAnsi(result.stderr), "");
		} else {
			assert.equal(stripAnsi(result.stderr), `${expected}\n`);
		}
	} else {
		assert.match(stripAnsi(result.stderr), expected);
	}
}

export function assertIdentical(got, want) {
	assert.equal(
		got.success,
		want.success,
		trimLeft(`one succeeded, one didn't (got ${got.success}, want ${want.success})

		GOT:
		${got.stdout}
		${got.stderr}

		WANT:
		${want.stdout}
		${want.stderr}`),
	);
	assert.equal(
		got.stdout,
		want.stdout,
		`Unexpected stdout

		GOT:
		${got.stdout}

		WANT:
		${want.stdout}`,
	);
}
