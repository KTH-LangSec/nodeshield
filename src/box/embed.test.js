import assert from "node:assert";
import test from "node:test";

import { escapeSpecialCharacters, removeSourceMaps } from "./embed.js";

test("embed.js", async (t) => {
	await t.test("escapeSpecialCharacters", async (t) => {
		await t.test("backslash", () => {
			const inp = `console.log("foo\\bar");`;
			const out = `console.log("foo\\\\bar");`;

			const got = escapeSpecialCharacters(inp);
			assert.equal(got, out);
		});

		await t.test("dollar", async (t) => {
			await t.test("stray", () => {
				const inp = `console.log("foo$bar");`;
				const out = `console.log("foo\\$bar");`;

				const got = escapeSpecialCharacters(inp);
				assert.equal(got, out);
			});

			await t.test("template literal (like)", () => {
				const inp = `console.log("foo\${bar}");`;
				const out = `console.log("foo\\\${bar}");`;

				const got = escapeSpecialCharacters(inp);
				assert.equal(got, out);
			});
		});

		await t.test("backtick", () => {
			const inp = "console.log(`foobar`);";
			const out = "console.log(\\`foobar\\`);";

			const got = escapeSpecialCharacters(inp);
			assert.equal(got, out);
		});
	});

	await t.test("removeSourceMaps", async (t) => {
		await t.test("file", () => {
			const program = `console.log("Hello world!");`;

			const inp = `${program}\n//# sourceMappingURL=program.js.map`;
			const out = `${program}\n`;

			const got = removeSourceMaps(inp);
			assert.equal(got, out);
		});

		await t.test("data", () => {
			const program = `console.log("Hello world!");`;

			const inp = `${program}\n//# sourceMappingURL=data:application/json;base64,example`;
			const out = `${program}\n`;

			const got = removeSourceMaps(inp);
			assert.equal(got, out);
		});
	});
});
