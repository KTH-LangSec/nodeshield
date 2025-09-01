import assert from "node:assert";
import test from "node:test";

import * as args from "../../src/args.js";

test("with leading 'node' argument", () => {
	const sbomArgValue = "foo.bar";

	const argv = ["node", "cli.js", "--sbom", sbomArgValue, "entrypoint.js"];
	const parsed = args.parse(argv);

	const got = parsed.sbomFile;
	const want = sbomArgValue;
	assert.strictEqual(got, want);
});

test("without leading 'node' argument", () => {
	const sbomArgValue = "foo.bar";

	const argv = ["cli.js", "--sbom", sbomArgValue, "entrypoint.js"];
	const parsed = args.parse(argv);

	const got = parsed.sbomFile;
	const want = sbomArgValue;
	assert.strictEqual(got, want);
});
