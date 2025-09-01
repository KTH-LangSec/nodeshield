import * as assert from "node:assert";
import { test } from "node:test";

import * as ext from "./_module.mjs";

test("evaluate with current scope's eval", async (t) => {
	await t.test("entry of globalThis", async (t) => {
		const name = "foo";
		const value = "bar";

		globalThis[name] = value;

		await t.test("can access implicitly (without object prefix)", () => {
			const got = eval(name);
			const want = value;
			assert.strictEqual(got, want);
		});

		await t.test("can access explicitly (with object prefix)", () => {
			const got = eval(`globalThis["${name}"]`);
			const want = value;
			assert.strictEqual(got, want);
		});

		delete globalThis[name];
	});

	await t.test("entry of global", async (t) => {
		const name = "foo";
		const value = "bar";

		global[name] = value;

		await t.test("can access implicitly (without object prefix)", () => {
			const got = eval(name);
			const want = value;
			assert.strictEqual(got, want);
		});

		await t.test("can access explicitly (with object prefix)", () => {
			const got = eval(`global["${name}"]`);
			const want = value;
			assert.strictEqual(got, want);
		});

		delete global[name];
	});

	await t.test("local variable", async (t) => {
		const outer = "bar";

		await t.test("can access current scope", () => {
			const current = "bar";

			const got = eval("current");
			const want = current;
			assert.strictEqual(got, want);
		});

		await t.test("can access outer scope", () => {
			const got = eval("outer");
			const want = outer;
			assert.strictEqual(got, want);
		});
	});

	await t.test("external local variable", async (t) => {
		await t.test("cannot access external scope", () => {
			const name = ext.localVariableName;

			assert.throws(() => eval(name), {
				name: "ReferenceError",
				message: `${name} is not defined`,
			});
		});
	});
});

test("evaluate with a reference to eval from a different scope", async (t) => {
	await t.test("entry of globalThis", async (t) => {
		const name = "foo";
		const value = "bar";

		globalThis[name] = value;

		await t.test("can access implicitly (without object prefix)", () => {
			const got = ext._eval(name);
			const want = value;
			assert.strictEqual(got, want);
		});

		await t.test("can access explicitly (with object prefix)", () => {
			const got = ext._eval(`globalThis["${name}"]`);
			const want = value;
			assert.strictEqual(got, want);
		});

		delete globalThis[name];
	});

	await t.test("entry of global", async (t) => {
		const name = "foo";
		const value = "bar";

		global[name] = value;

		await t.test("can access implicitly (without object prefix)", () => {
			const got = ext._eval(name);
			const want = value;
			assert.strictEqual(got, want);
		});

		await t.test("can access explicitly (with object prefix)", () => {
			const got = ext._eval(`global["${name}"]`);
			const want = value;
			assert.strictEqual(got, want);
		});

		delete global[name];
	});

	await t.test("local variable", async (t) => {
		const _outer = "bar";

		await t.test("cannot access current scope", () => {
			const _current = "bar";
			const name = "_current";

			assert.throws(() => ext._eval(name), {
				name: "ReferenceError",
				message: `${name} is not defined`,
			});

			// sanity check
			assert.doesNotThrow(() => eval(name));
		});

		await t.test("cannot access outer scope", () => {
			const name = "_outer";

			assert.throws(() => ext._eval(name), {
				name: "ReferenceError",
				message: `${name} is not defined`,
			});

			// sanity check
			assert.doesNotThrow(() => eval(name));
		});
	});

	await t.test("external local variable", async (t) => {
		await t.test("cannot access external scope", () => {
			const name = ext.localVariableName;

			assert.throws(() => ext._eval(name), {
				name: "ReferenceError",
				message: `${name} is not defined`,
			});

			// sanity check
			assert.throws(() => eval(name));
		});
	});
});

test("evaluate with a Function ref from a different scope", async (t) => {
	await t.test("entry of globalThis", async (t) => {
		const name = "foo";
		const value = "bar";

		globalThis[name] = value;

		await t.test("cannot access implicitly (without object prefix)", () => {
			const got = new ext._Function(name)();
			const want = undefined;
			assert.strictEqual(got, want);
		});

		await t.test("cannot access explicitly (with object prefix)", () => {
			const got = ext._Function(`globalThis["${name}"]`)();
			const want = undefined;
			assert.strictEqual(got, want);
		});

		delete globalThis[name];
	});

	await t.test("entry of global", async (t) => {
		const name = "foo";
		const value = "bar";

		global[name] = value;

		await t.test("cannot access implicitly (without object prefix)", () => {
			const got = ext._Function(name)();
			const want = undefined;
			assert.strictEqual(got, want);
		});

		await t.test("cannot access explicitly (with object prefix)", () => {
			const got = ext._Function(`global["${name}"]`)();
			const want = undefined;
			assert.strictEqual(got, want);
		});

		delete global[name];
	});

	await t.test("local variable", async (t) => {
		const _outer = "bar";

		await t.test("cannot access current scope", () => {
			const _current = "bar";
			const name = "_current";

			assert.throws(() => ext._Function(name)(), {
				name: "ReferenceError",
				message: `${name} is not defined`,
			});

			// sanity check
			assert.doesNotThrow(() => eval(name));
		});

		await t.test("cannot access outer scope", () => {
			const name = "_outer";

			assert.throws(() => ext._Function(name)(), {
				name: "ReferenceError",
				message: `${name} is not defined`,
			});

			// sanity check
			assert.doesNotThrow(() => eval(name));
		});
	});

	await t.test("external local variable", async (t) => {
		await t.test("cannot access external scope", () => {
			const name = ext.localVariableName;

			assert.throws(() => ext._Function(name)(), {
				name: "ReferenceError",
				message: `${name} is not defined`,
			});
		});
	});
});

test("evaluate with a constructor ref from a different scope", async (t) => {
	await t.test("entry of globalThis", async (t) => {
		const name = "foo";
		const value = "bar";

		globalThis[name] = value;

		await t.test("cannot access implicitly (without object prefix)", () => {
			const got = ext._constructor(name)();
			const want = undefined;
			assert.strictEqual(got, want);
		});

		await t.test("cannot access explicitly (with object prefix)", () => {
			const got = ext._constructor(`globalThis["${name}"]`)();
			const want = undefined;
			assert.strictEqual(got, want);
		});

		delete globalThis[name];
	});

	await t.test("entry of global", async (t) => {
		const name = "foo";
		const value = "bar";

		global[name] = value;

		await t.test("cannot access implicitly (without object prefix)", () => {
			const got = ext._constructor(name)();
			const want = undefined;
			assert.strictEqual(got, want);
		});

		await t.test("cannot access explicitly (with object prefix)", () => {
			const got = ext._constructor(`global["${name}"]`)();
			const want = undefined;
			assert.strictEqual(got, want);
		});

		delete global[name];
	});

	await t.test("local variable", async (t) => {
		const _outer = "bar";

		await t.test("cannot access current scope", () => {
			const _current = "bar";
			const name = "_current";

			assert.throws(() => ext._constructor(name)(), {
				name: "ReferenceError",
				message: `${name} is not defined`,
			});

			// sanity check
			assert.doesNotThrow(() => eval(name));
		});

		await t.test("cannot access outer scope", () => {
			const name = "_outer";

			assert.throws(() => ext._constructor(name)(), {
				name: "ReferenceError",
				message: `${name} is not defined`,
			});

			// sanity check
			assert.doesNotThrow(() => eval(name));
		});
	});

	await t.test("external local variable", async (t) => {
		await t.test("cannot access external scope", () => {
			const name = ext.localVariableName;

			assert.throws(() => ext._constructor(name)(), {
				name: "ReferenceError",
				message: `${name} is not defined`,
			});
		});
	});
});

test("evaluate code in a different scope", async (t) => {
	await t.test("entry of globalThis", async (t) => {
		const name = "foo";
		const value = "bar";

		globalThis[name] = value;

		await t.test("can access implicitly (without object prefix)", () => {
			const got = ext.doEval(name);
			const want = value;
			assert.strictEqual(got, want);
		});

		await t.test("can access explicitly (with object prefix)", () => {
			const got = ext.doEval(`globalThis["${name}"]`);
			const want = value;
			assert.strictEqual(got, want);
		});

		delete globalThis[name];
	});

	await t.test("entry of global", async (t) => {
		const name = "foo";
		const value = "bar";

		global[name] = value;

		await t.test("can access implicitly (without object prefix)", () => {
			const got = ext.doEval(name);
			const want = value;
			assert.strictEqual(got, want);
		});

		await t.test("can access explicitly (with object prefix)", () => {
			const got = ext.doEval(`global["${name}"]`);
			const want = value;
			assert.strictEqual(got, want);
		});

		delete global[name];
	});

	await t.test("local variable", async (t) => {
		const _outer = "bar";

		await t.test("cannot access current scope", () => {
			const _current = "bar";
			const name = "_current";

			assert.throws(() => ext.doEval(name), {
				name: "ReferenceError",
				message: `${name} is not defined`,
			});

			// sanity check
			assert.doesNotThrow(() => eval(name));
		});

		await t.test("cannot access outer scope", () => {
			const name = "_outer";

			assert.throws(() => ext.doEval(name), {
				name: "ReferenceError",
				message: `${name} is not defined`,
			});

			// sanity check
			assert.doesNotThrow(() => eval(name));
		});
	});

	await t.test("external local variable", async (t) => {
		await t.test("can access external scope", () => {
			const name = ext.localVariableName;

			assert.doesNotThrow(() => ext.doEval(name));

			// sanity check
			assert.throws(() => eval(name));
		});
	});
});
