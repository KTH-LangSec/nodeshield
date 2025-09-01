import * as cp from "node:child_process";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import {
	assertSuccess,
	assertFailure,
	assertStdout,
	assertStderr,
	assertIdentical,
} from "./shared.js";

import * as names from "../../src/box/names.js";
import {
	globalsProxy,
	createModuleShimCodeCjs,
	createPathShimCodeCjs,
	createVmShimCodeCjs,
} from "../../src/box/internals/index.js";
import { generateBoxCjs } from "../../src/box/cjs/index.js";
import { embed } from "../../src/box/embed.js";
import { NODE_CLI_OPTIONS } from "../../src/cli.js";
import { STRATEGIES } from "../../src/policy.js";

const defaultStrategy = STRATEGIES.throw;
const defaultPermissions = {
	code: false,
	network: false,
	process: false,
	import: {
		packages: [],
		files: [],
	},
};

test("permissions", async (t) => {
	const strategy = defaultStrategy;

	await t.test("code", async (t) => {
		await t.test("allowed", async (t) => {
			const permissions = {
				...defaultPermissions,
				code: true,
				import: {
					packages: ["node:vm", "vm"],
					files: [],
				},
			};

			await t.test("import", async (t) => {
				const testCases = ["node:vm", "vm"];

				for (const testCase of testCases) {
					await t.test(`require - '${testCase}'`, async () => {
						const src = `
							const got = require("${testCase}");
							console.log("import worked:", got !== undefined);
						`;

						const result = await runBoxed({ strategy, permissions, src });

						assertSuccess(result);
						assertStdout(result, "import worked: true");
					});

					await t.test(
						`process.mainModule.require - '${testCase}'`,
						async () => {
							const permissions2 = {
								...permissions,
								process: true,
							};

							const src = `
							const got = process.mainModule.require("${testCase}");
							console.log("import worked:", got !== undefined);
						`;

							const result = await runBoxed({
								strategy,
								permissions: permissions2,
								src,
							});

							assertSuccess(result);
							assertStdout(result, "import worked: true");
						},
					);

					await t.test(`import - '${testCase}'`, async () => {
						const src = `
							(async () => {
								const got = await import("${testCase}");
								console.log("import worked:", got !== undefined);
							})();
						`;

						const result = await runBoxed({ strategy, permissions, src });

						assertSuccess(result);
						assertStdout(result, "import worked: true");
					});
				}
			});

			await t.test("eval global", async (t) => {
				await t.test("ambient access", async () => {
					const src = `
						console.log("eval is defined:", eval !== undefined);
						console.log("evaluate:", eval("1+1"));
					`;

					const result = await runBoxed({ strategy, permissions, src });

					assertSuccess(result);
					assertStdout(result, "eval is defined: true\nevaluate: 2");
				});

				await t.test("globalThis access", async () => {
					const src = `
						console.log("eval is defined:", globalThis.eval !== undefined);
						console.log("evaluate:", globalThis.eval("1+1"));
					`;

					const result = await runBoxed({ strategy, permissions, src });

					assertSuccess(result);
					assertStdout(result, "eval is defined: true\nevaluate: 2");
				});

				await t.test("global access", async () => {
					const src = `
						console.log("eval is defined:", global.eval !== undefined);
						console.log("evaluate:", global.eval("1+1"));
					`;

					const result = await runBoxed({ strategy, permissions, src });

					assertSuccess(result);
					assertStdout(result, "eval is defined: true\nevaluate: 2");
				});
			});

			await t.test("Function global", async (t) => {
				await t.test("ambient access", async () => {
					const src = `
						console.log("Function is defined:", Function !== undefined);
						console.log("evaluate:", new Function("return 1+1")());
					`;

					const result = await runBoxed({ strategy, permissions, src });

					assertSuccess(result);
					assertStdout(result, "Function is defined: true\nevaluate: 2");
				});

				await t.test("globalThis access", async () => {
					const src = `
						console.log("Function is defined:", globalThis.Function !== undefined);
						console.log("evaluate:", new globalThis.Function("return 1+1")());
					`;

					const result = await runBoxed({ strategy, permissions, src });

					assertSuccess(result);
					assertStdout(result, "Function is defined: true\nevaluate: 2");
				});

				await t.test("global access", async () => {
					const src = `
						console.log("Function is defined:", global.Function !== undefined);
						console.log("evaluate:", new global.Function("return 1+1")());
					`;

					const result = await runBoxed({ strategy, permissions, src });

					assertSuccess(result);
					assertStdout(result, "Function is defined: true\nevaluate: 2");
				});
			});

			await t.test("module local constructor", async () => {
				const src = `
					const result = Object.constructor("return 1+1")();
					console.log(result);
				`;

				const result = await runBoxed({ strategy, permissions, src });

				assertSuccess(result);
				assertStdout(result, "2");
			});

			await t.test(
				"dynamic access to a sensitive ambient access",
				async (t) => {
					await t.test("when allowed", async () => {
						const permissions = {
							...defaultPermissions,
							code: true,
							process: true,
						};

						const src = `
							console.log("evaluate:", eval("typeof process.argv"));
						`;

						const result = await runBoxed({ strategy, permissions, src });

						assertSuccess(result);
						assertStdout(result, "evaluate: object");
					});

					await t.test("when disallowed", async () => {
						const permissions = {
							...defaultPermissions,
							code: true,
							process: false,
						};

						const src = `
							console.log("evaluate:", eval("typeof process.argv"));
						`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStderr(result, /using 'process' is not allowed/);
					});
				},
			);
		});

		await t.test("disallowed", async (t) => {
			const permissions = {
				...defaultPermissions,
				code: false,
			};

			await t.test("import", async (t) => {
				const testCases = ["node:vm", "vm"];

				for (const testCase of testCases) {
					await t.test(`require - '${testCase}'`, async () => {
						const src = `
							const got = require("${testCase}");
							console.log("import worked:", got !== undefined);
						`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStderr(
							result,
							new RegExp(`Error: using '${testCase}' is not allowed`),
						);
					});

					await t.test(
						`process.mainModule.require - '${testCase}'`,
						async () => {
							const permissions2 = {
								...permissions,
								process: true,
							};

							const src = `
							const got = process.mainModule.require("${testCase}");
							console.log("import worked:", got !== undefined);
						`;

							const result = await runBoxed({
								strategy,
								permissions: permissions2,
								src,
							});

							assertFailure(result);
							assertStderr(
								result,
								new RegExp(`Error: using '${testCase}' is not allowed`),
							);
						},
					);

					await t.test(`import - '${testCase}'`, async () => {
						const src = `
							(async () => {
								const got = await import("${testCase}");
								console.log("import worked:", got !== undefined);
							})();
						`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStderr(
							result,
							new RegExp(`Error: using '${testCase}' is not allowed`),
						);
					});
				}
			});

			await t.test("eval global", async (t) => {
				await t.test("ambient access", async (t) => {
					await t.test("strategy: exit", async () => {
						const strategy = STRATEGIES.exit;
						const src = `
										console.log("eval is defined:", eval !== undefined);
										console.log("evaluate:", eval("1+1"));
									`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStdout(result, /using 'eval' is not allowed/);
					});

					await t.test("strategy: log", async (t) => {
						t.todo();
					});

					await t.test("strategy: throw", async () => {
						const strategy = STRATEGIES.throw;
						const src = `
										console.log("eval is defined:", eval !== undefined);
										console.log("evaluate:", eval("1+1"));
									`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStdout(result, "eval is defined: true");
						assertStderr(result, /using 'eval' is not allowed/);
					});
				});

				await t.test("globalThis access", async (t) => {
					await t.test("strategy: exit", async () => {
						const strategy = STRATEGIES.exit;
						const src = `
										console.log("eval is defined:", globalThis.eval !== undefined);
										console.log("evaluate:", globalThis.eval("1+1"));
									`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStdout(result, /using 'eval' is not allowed/);
					});

					await t.test("strategy: log", async (t) => {
						t.todo();
					});

					await t.test("strategy: throw", async () => {
						const strategy = STRATEGIES.throw;
						const src = `
										console.log("eval is defined:", globalThis.eval !== undefined);
										console.log("evaluate:", globalThis.eval("1+1"));
									`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStdout(result, "eval is defined: true");
						assertStderr(result, /using 'eval' is not allowed/);
					});
				});

				await t.test("global access", async (t) => {
					await t.test("strategy: exit", async () => {
						const strategy = STRATEGIES.exit;
						const src = `
										console.log("eval is defined:", global.eval !== undefined);
										console.log("evaluate:", global.eval("1+1"));
									`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStdout(result, /using 'eval' is not allowed/);
					});

					await t.test("strategy: log", async (t) => {
						t.todo();
					});

					await t.test("strategy: throw", async () => {
						const strategy = STRATEGIES.throw;
						const src = `
										console.log("eval is defined:", global.eval !== undefined);
										console.log("evaluate:", global.eval("1+1"));
									`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStdout(result, "eval is defined: true");
						assertStderr(result, /using 'eval' is not allowed/);
					});
				});
			});

			await t.test("Function global", async (t) => {
				await t.test("ambient access", async (t) => {
					await t.test("strategy: exit", async () => {
						const strategy = STRATEGIES.exit;
						const src = `
							console.log("Function is defined:", Function !== undefined);
							console.log("evaluate:", new Function("return 1+1")());
						`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStdout(result, /using 'Function' is not allowed/);
					});

					await t.test("strategy: log", async (t) => {
						t.todo();
					});

					await t.test("strategy: throw", async () => {
						const strategy = STRATEGIES.throw;
						const src = `
							console.log("Function is defined:", Function !== undefined);
							console.log("evaluate:", new Function("return 1+1")());
						`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStdout(result, "Function is defined: true");
						assertStderr(result, /using 'Function' is not allowed/);
					});
				});

				await t.test("globalThis access", async (t) => {
					await t.test("strategy: exit", async () => {
						const strategy = STRATEGIES.exit;
						const src = `
							console.log("Function is defined:", globalThis.Function !== undefined);
							console.log("evaluate:", new globalThis.Function("return 1+1")());
						`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStdout(result, /using 'Function' is not allowed/);
					});

					await t.test("strategy: log", async (t) => {
						t.todo();
					});

					await t.test("strategy: throw", async () => {
						const strategy = STRATEGIES.throw;
						const src = `
							console.log("Function is defined:", globalThis.Function !== undefined);
							console.log("evaluate:", new globalThis.Function("return 1+1")());
						`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStdout(result, "Function is defined: true");
						assertStderr(result, /using 'Function' is not allowed/);
					});
				});

				await t.test("global access", async (t) => {
					await t.test("strategy: exit", async () => {
						const strategy = STRATEGIES.exit;
						const src = `
							console.log("Function is defined:", global.Function !== undefined);
							console.log("evaluate:", new global.Function("return 1+1")());
						`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStdout(result, /using 'Function' is not allowed/);
					});

					await t.test("strategy: log", async (t) => {
						t.todo();
					});

					await t.test("strategy: throw", async () => {
						const strategy = STRATEGIES.throw;
						const src = `
							console.log("Function is defined:", global.Function !== undefined);
							console.log("evaluate:", new global.Function("return 1+1")());
						`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStdout(result, "Function is defined: true");
						assertStderr(result, /using 'Function' is not allowed/);
					});
				});
			});

			await t.test("module local constructor", async () => {
				const src = `
					const result = {}.constructor.constructor("return 1+1")();
					console.log(result);
				`;

				const result = await runBoxed({ strategy, permissions, src });

				assertFailure(result);
				assertStderr(
					result,
					/EvalError: Code generation from strings disallowed for this context/,
				);
			});
		});
	});

	await t.test("crypto", async (t) => {
		await t.test("allowed", async (t) => {
			const permissions = {
				...defaultPermissions,
				crypto: true,
				import: {
					packages: ["crypto", "node:crypto"],
					files: [],
				},
			};

			await t.test("import", async (t) => {
				const testCases = ["node:crypto", "crypto"];

				for (const testCase of testCases) {
					await t.test(`require - '${testCase}'`, async () => {
						const src = `
							const got = require("${testCase}");
							console.log("import worked:", got !== undefined);
						`;

						const result = await runBoxed({ strategy, permissions, src });

						assertSuccess(result);
						assertStdout(result, "import worked: true");
					});

					await t.test(
						`process.mainModule.require - '${testCase}'`,
						async () => {
							const permissions2 = {
								...permissions,
								process: true,
							};

							const src = `
							const got = process.mainModule.require("${testCase}");
							console.log("import worked:", got !== undefined);
						`;

							const result = await runBoxed({
								strategy,
								permissions: permissions2,
								src,
							});

							assertSuccess(result);
							assertStdout(result, "import worked: true");
						},
					);

					await t.test(`import - '${testCase}'`, async () => {
						const src = `
							(async () => {
								const got = await import("${testCase}");
								console.log("import worked:", got !== undefined);
							})();
						`;

						const result = await runBoxed({ strategy, permissions, src });

						assertSuccess(result);
						assertStdout(result, "import worked: true");
					});
				}
			});

			await t.test("crypto global", async (t) => {
				await t.test("ambient access", async () => {
					const src = `
							console.log("crypto is defined:", crypto !== undefined);
						`;

					const result = await runBoxed({ strategy, permissions, src });

					assertSuccess(result);
					assertStdout(result, "crypto is defined: true");
				});

				await t.test("globalThis access", async () => {
					const src = `
							console.log("crypto is defined:", globalThis.crypto !== undefined);
						`;

					const result = await runBoxed({ strategy, permissions, src });

					assertSuccess(result);
					assertStdout(result, "crypto is defined: true");
				});

				await t.test("globalThis has", async () => {
					const src = `
							console.log("crypto is defined:", "crypto" in globalThis);
						`;

					const result = await runBoxed({ strategy, permissions, src });

					assertSuccess(result);
					assertStdout(result, "crypto is defined: true");
				});

				await t.test("globalThis keys", async () => {
					const src = `
							console.log("crypto is defined:", Reflect.ownKeys(globalThis).includes("crypto"));
						`;

					const result = await runBoxed({ strategy, permissions, src });

					assertSuccess(result);
					assertStdout(result, "crypto is defined: true");
				});

				await t.test("global access", async () => {
					const src = `
							console.log("crypto is defined:", global.crypto !== undefined);
						`;

					const result = await runBoxed({ strategy, permissions, src });

					assertSuccess(result);
					assertStdout(result, "crypto is defined: true");
				});

				await t.test("global has", async () => {
					const src = `
							console.log("crypto is defined:", "crypto" in global);
						`;

					const result = await runBoxed({ strategy, permissions, src });

					assertSuccess(result);
					assertStdout(result, "crypto is defined: true");
				});

				await t.test("global keys", async () => {
					const src = `
							console.log("crypto is defined:", Reflect.ownKeys(global).includes("crypto"));
						`;

					const result = await runBoxed({ strategy, permissions, src });

					assertSuccess(result);
					assertStdout(result, "crypto is defined: true");
				});
			});

			await t.test("Crypto global", async (t) => {
				await t.test("ambient access", async () => {
					const src = `
							console.log("Crypto is defined:", Crypto !== undefined);
						`;

					const result = await runBoxed({ strategy, permissions, src });

					assertSuccess(result);
					assertStdout(result, "Crypto is defined: true");
				});

				await t.test("globalThis access", async () => {
					const src = `
							console.log("Crypto is defined:", globalThis.Crypto !== undefined);
						`;

					const result = await runBoxed({ strategy, permissions, src });

					assertSuccess(result);
					assertStdout(result, "Crypto is defined: true");
				});

				await t.test("globalThis has", async () => {
					const src = `
							console.log("Crypto is defined:", "Crypto" in globalThis);
						`;

					const result = await runBoxed({ strategy, permissions, src });

					assertSuccess(result);
					assertStdout(result, "Crypto is defined: true");
				});

				await t.test("globalThis keys", async () => {
					const src = `
							console.log("Crypto is defined:", Reflect.ownKeys(globalThis).includes("Crypto"));
						`;

					const result = await runBoxed({ strategy, permissions, src });

					assertSuccess(result);
					assertStdout(result, "Crypto is defined: true");
				});

				await t.test("global access", async () => {
					const src = `
							console.log("Crypto is defined:", global.Crypto !== undefined);
						`;

					const result = await runBoxed({ strategy, permissions, src });

					assertSuccess(result);
					assertStdout(result, "Crypto is defined: true");
				});

				await t.test("global has", async () => {
					const src = `
							console.log("Crypto is defined:", "Crypto" in global);
						`;

					const result = await runBoxed({ strategy, permissions, src });

					assertSuccess(result);
					assertStdout(result, "Crypto is defined: true");
				});

				await t.test("global keys", async () => {
					const src = `
							console.log("Crypto is defined:", Reflect.ownKeys(global).includes("Crypto"));
						`;

					const result = await runBoxed({ strategy, permissions, src });

					assertSuccess(result);
					assertStdout(result, "Crypto is defined: true");
				});
			});

			await t.test("CryptoKey global", async (t) => {
				await t.test("ambient access", async () => {
					const src = `
							console.log("CryptoKey is defined:", CryptoKey !== undefined);
						`;

					const result = await runBoxed({ strategy, permissions, src });

					assertSuccess(result);
					assertStdout(result, "CryptoKey is defined: true");
				});

				await t.test("globalThis access", async () => {
					const src = `
							console.log("CryptoKey is defined:", globalThis.CryptoKey !== undefined);
						`;

					const result = await runBoxed({ strategy, permissions, src });

					assertSuccess(result);
					assertStdout(result, "CryptoKey is defined: true");
				});

				await t.test("globalThis has", async () => {
					const src = `
							console.log("CryptoKey is defined:", "CryptoKey" in globalThis);
						`;

					const result = await runBoxed({ strategy, permissions, src });

					assertSuccess(result);
					assertStdout(result, "CryptoKey is defined: true");
				});

				await t.test("globalThis keys", async () => {
					const src = `
							console.log("CryptoKey is defined:", Reflect.ownKeys(globalThis).includes("CryptoKey"));
						`;

					const result = await runBoxed({ strategy, permissions, src });

					assertSuccess(result);
					assertStdout(result, "CryptoKey is defined: true");
				});

				await t.test("global access", async () => {
					const src = `
							console.log("CryptoKey is defined:", global.CryptoKey !== undefined);
						`;

					const result = await runBoxed({ strategy, permissions, src });

					assertSuccess(result);
					assertStdout(result, "CryptoKey is defined: true");
				});

				await t.test("global has", async () => {
					const src = `
							console.log("CryptoKey is defined:", "CryptoKey" in global);
						`;

					const result = await runBoxed({ strategy, permissions, src });

					assertSuccess(result);
					assertStdout(result, "CryptoKey is defined: true");
				});

				await t.test("global keys", async () => {
					const src = `
							console.log("CryptoKey is defined:", Reflect.ownKeys(global).includes("CryptoKey"));
						`;

					const result = await runBoxed({ strategy, permissions, src });

					assertSuccess(result);
					assertStdout(result, "CryptoKey is defined: true");
				});
			});

			await t.test("SubtleCrypto global", async (t) => {
				await t.test("ambient access", async () => {
					const src = `
							console.log("SubtleCrypto is defined:", SubtleCrypto !== undefined);
						`;

					const result = await runBoxed({ strategy, permissions, src });

					assertSuccess(result);
					assertStdout(result, "SubtleCrypto is defined: true");
				});

				await t.test("globalThis access", async () => {
					const src = `
							console.log("SubtleCrypto is defined:", globalThis.SubtleCrypto !== undefined);
						`;

					const result = await runBoxed({ strategy, permissions, src });

					assertSuccess(result);
					assertStdout(result, "SubtleCrypto is defined: true");
				});

				await t.test("globalThis has", async () => {
					const src = `
							console.log("SubtleCrypto is defined:", "SubtleCrypto" in globalThis);
						`;

					const result = await runBoxed({ strategy, permissions, src });

					assertSuccess(result);
					assertStdout(result, "SubtleCrypto is defined: true");
				});

				await t.test("globalThis keys", async () => {
					const src = `
							console.log("SubtleCrypto is defined:", Reflect.ownKeys(globalThis).includes("SubtleCrypto"));
						`;

					const result = await runBoxed({ strategy, permissions, src });

					assertSuccess(result);
					assertStdout(result, "SubtleCrypto is defined: true");
				});

				await t.test("global access", async () => {
					const src = `
							console.log("SubtleCrypto is defined:", global.SubtleCrypto !== undefined);
						`;

					const result = await runBoxed({ strategy, permissions, src });

					assertSuccess(result);
					assertStdout(result, "SubtleCrypto is defined: true");
				});

				await t.test("global has", async () => {
					const src = `
							console.log("SubtleCrypto is defined:", "SubtleCrypto" in global);
						`;

					const result = await runBoxed({ strategy, permissions, src });

					assertSuccess(result);
					assertStdout(result, "SubtleCrypto is defined: true");
				});

				await t.test("global keys", async () => {
					const src = `
							console.log("SubtleCrypto is defined:", Reflect.ownKeys(global).includes("SubtleCrypto"));
						`;

					const result = await runBoxed({ strategy, permissions, src });

					assertSuccess(result);
					assertStdout(result, "SubtleCrypto is defined: true");
				});
			});
		});

		await t.test("disallowed", async (t) => {
			const permissions = {
				...defaultPermissions,
				crypto: false,
			};

			await t.test("import", async (t) => {
				const testCases = ["node:crypto", "crypto"];

				for (const testCase of testCases) {
					await t.test(`require - '${testCase}'`, async () => {
						const src = `
							const got = require("${testCase}");
							console.log("import worked:", got !== undefined);
						`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStderr(
							result,
							new RegExp(`Error: using '${testCase}' is not allowed`),
						);
					});

					await t.test(
						`process.mainModule.require - '${testCase}'`,
						async () => {
							const permissions2 = {
								...permissions,
								process: true,
							};

							const src = `
							const got = process.mainModule.require("${testCase}");
							console.log("import worked:", got !== undefined);
						`;

							const result = await runBoxed({
								strategy,
								permissions: permissions2,
								src,
							});

							assertFailure(result);
							assertStderr(
								result,
								new RegExp(`Error: using '${testCase}' is not allowed`),
							);
						},
					);

					await t.test(`import - '${testCase}'`, async () => {
						const src = `
							(async () => {
								const got = await import("${testCase}");
								console.log("import worked:", got !== undefined);
							})();
						`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStderr(
							result,
							new RegExp(`Error: using '${testCase}' is not allowed`),
						);
					});
				}
			});

			await t.test("crypto global", async (t) => {
				await t.test("ambient access", async (t) => {
					await t.test("strategy: exit", async () => {
						const strategy = STRATEGIES.exit;
						const src = `
								console.log("crypto is defined:", crypto.foobar === undefined);
							`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStdout(result, /using 'crypto' is not allowed/);
					});

					await t.test("strategy: log", async () => {
						const strategy = STRATEGIES.log;
						const src = `
								console.log("crypto is defined:", crypto.foobar === undefined);
							`;

						const result = await runBoxed({ strategy, permissions, src });

						assertSuccess(result);
						assertStdout(result, /using 'crypto' is not allowed/);
						assertStdout(result, /crypto is defined: true/);
					});

					await t.test("strategy: throw", async () => {
						const strategy = STRATEGIES.throw;
						const src = `
								console.log("crypto is defined:", crypto.foobar === undefined);
							`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStderr(result, /using 'crypto' is not allowed/);
					});
				});

				await t.test("globalThis access", async (t) => {
					await t.test("strategy: exit", async () => {
						const strategy = STRATEGIES.exit;
						const src = `
								console.log("crypto is defined:", globalThis.crypto.foobar === undefined);
							`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStdout(result, /using 'crypto' is not allowed/);
					});

					await t.test("strategy: log", async () => {
						const strategy = STRATEGIES.log;
						const src = `
								console.log("crypto is defined:", globalThis.crypto.foobar === undefined);
							`;

						const result = await runBoxed({ strategy, permissions, src });

						assertSuccess(result);
						assertStdout(result, /using 'crypto' is not allowed/);
						assertStdout(result, /crypto is defined: true/);
					});

					await t.test("strategy: throw", async () => {
						const strategy = STRATEGIES.throw;
						const src = `
								console.log("crypto is defined:", globalThis.crypto.foobar === undefined);
							`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStderr(result, /Error: using 'crypto' is not allowed/);
					});
				});

				await t.test("globalThis has", async (t) => {
					for (const strategy of Object.values(STRATEGIES)) {
						await t.test(`strategy: ${strategy.description}`, async () => {
							const strategy = STRATEGIES.exit;
							const src = `
									console.log("crypto is defined:", "crypto" in globalThis);
								`;

							const result = await runBoxed({ strategy, permissions, src });

							assertSuccess(result);
							assertStdout(result, "crypto is defined: false");
						});
					}
				});

				await t.test("globalThis keys", async (t) => {
					for (const strategy of Object.values(STRATEGIES)) {
						await t.test(`strategy: ${strategy.description}`, async () => {
							const src = `
									console.log("crypto is defined:", Reflect.ownKeys(globalThis).includes("crypto"));
								`;

							const result = await runBoxed({ strategy, permissions, src });

							assertSuccess(result);
							assertStdout(result, "crypto is defined: false");
						});
					}
				});

				await t.test("global access", async (t) => {
					await t.test("strategy: exit", async () => {
						const strategy = STRATEGIES.exit;
						const src = `
								console.log("crypto is defined:", global.crypto.foobar === undefined);
							`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStdout(result, /using 'crypto' is not allowed/);
					});

					await t.test("strategy: log", async () => {
						const strategy = STRATEGIES.log;
						const src = `
								console.log("crypto is defined:", global.crypto.foobar === undefined);
							`;

						const result = await runBoxed({ strategy, permissions, src });

						assertSuccess(result);
						assertStdout(result, /using 'crypto' is not allowed/);
						assertStdout(result, /crypto is defined: true/);
					});

					await t.test("strategy: throw", async () => {
						const strategy = STRATEGIES.throw;
						const src = `
								console.log("crypto is defined:", global.crypto.foobar === undefined);
							`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStderr(result, /Error: using 'crypto' is not allowed/);
					});
				});

				await t.test("global has", async (t) => {
					for (const strategy of Object.values(STRATEGIES)) {
						await t.test(`strategy: ${strategy.description}`, async () => {
							const strategy = STRATEGIES.exit;
							const src = `
									console.log("crypto is defined:", "crypto" in global);
								`;

							const result = await runBoxed({ strategy, permissions, src });

							assertSuccess(result);
							assertStdout(result, "crypto is defined: false");
						});
					}
				});

				await t.test("global keys", async (t) => {
					for (const strategy of Object.values(STRATEGIES)) {
						await t.test(`strategy: ${strategy.description}`, async () => {
							const src = `
									console.log("crypto is defined:", Reflect.ownKeys(global).includes("crypto"));
								`;

							const result = await runBoxed({ strategy, permissions, src });

							assertSuccess(result);
							assertStdout(result, "crypto is defined: false");
						});
					}
				});
			});

			await t.test("Crypto global", async (t) => {
				await t.test("ambient access", async (t) => {
					await t.test("strategy: exit", async () => {
						const strategy = STRATEGIES.exit;
						const src = `
								console.log("Crypto is defined:", Crypto.foobar === undefined);
							`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStdout(result, /using 'Crypto' is not allowed/);
					});

					await t.test("strategy: log", async () => {
						const strategy = STRATEGIES.log;
						const src = `
								console.log("Crypto is defined:", Crypto.foobar === undefined);
							`;

						const result = await runBoxed({ strategy, permissions, src });

						assertSuccess(result);
						assertStdout(result, /using 'Crypto' is not allowed/);
						assertStdout(result, /Crypto is defined: true/);
					});

					await t.test("strategy: throw", async () => {
						const strategy = STRATEGIES.throw;
						const src = `
								console.log("Crypto is defined:", Crypto.foobar === undefined);
							`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStderr(result, /using 'Crypto' is not allowed/);
					});
				});

				await t.test("globalThis access", async (t) => {
					await t.test("strategy: exit", async () => {
						const strategy = STRATEGIES.exit;
						const src = `
								console.log("Crypto is defined:", globalThis.Crypto.foobar === undefined);
							`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStdout(result, /using 'Crypto' is not allowed/);
					});

					await t.test("strategy: log", async () => {
						const strategy = STRATEGIES.log;
						const src = `
								console.log("Crypto is defined:", globalThis.Crypto.foobar === undefined);
							`;

						const result = await runBoxed({ strategy, permissions, src });

						assertSuccess(result);
						assertStdout(result, /using 'Crypto' is not allowed/);
						assertStdout(result, /Crypto is defined: true/);
					});

					await t.test("strategy: throw", async () => {
						const strategy = STRATEGIES.throw;
						const src = `
								console.log("Crypto is defined:", globalThis.Crypto.foobar === undefined);
							`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStderr(result, /Error: using 'Crypto' is not allowed/);
					});
				});

				await t.test("globalThis has", async (t) => {
					for (const strategy of Object.values(STRATEGIES)) {
						await t.test(`strategy: ${strategy.description}`, async () => {
							const strategy = STRATEGIES.exit;
							const src = `
									console.log("Crypto is defined:", "Crypto" in globalThis);
								`;

							const result = await runBoxed({ strategy, permissions, src });

							assertSuccess(result);
							assertStdout(result, "Crypto is defined: false");
						});
					}
				});

				await t.test("globalThis keys", async (t) => {
					for (const strategy of Object.values(STRATEGIES)) {
						await t.test(`strategy: ${strategy.description}`, async () => {
							const src = `
									console.log("Crypto is defined:", Reflect.ownKeys(globalThis).includes("Crypto"));
								`;

							const result = await runBoxed({ strategy, permissions, src });

							assertSuccess(result);
							assertStdout(result, "Crypto is defined: false");
						});
					}
				});

				await t.test("global access", async (t) => {
					await t.test("strategy: exit", async () => {
						const strategy = STRATEGIES.exit;
						const src = `
								console.log("Crypto is defined:", global.Crypto.foobar === undefined);
							`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStdout(result, /using 'Crypto' is not allowed/);
					});

					await t.test("strategy: log", async () => {
						const strategy = STRATEGIES.log;
						const src = `
								console.log("Crypto is defined:", global.Crypto.foobar === undefined);
							`;

						const result = await runBoxed({ strategy, permissions, src });

						assertSuccess(result);
						assertStdout(result, /using 'Crypto' is not allowed/);
						assertStdout(result, /Crypto is defined: true/);
					});

					await t.test("strategy: throw", async () => {
						const strategy = STRATEGIES.throw;
						const src = `
								console.log("Crypto is defined:", global.Crypto.foobar === undefined);
							`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStderr(result, /Error: using 'Crypto' is not allowed/);
					});
				});

				await t.test("global has", async (t) => {
					for (const strategy of Object.values(STRATEGIES)) {
						await t.test(`strategy: ${strategy.description}`, async () => {
							const strategy = STRATEGIES.exit;
							const src = `
									console.log("Crypto is defined:", "Crypto" in global);
								`;

							const result = await runBoxed({ strategy, permissions, src });

							assertSuccess(result);
							assertStdout(result, "Crypto is defined: false");
						});
					}
				});

				await t.test("global keys", async (t) => {
					for (const strategy of Object.values(STRATEGIES)) {
						await t.test(`strategy: ${strategy.description}`, async () => {
							const src = `
									console.log("Crypto is defined:", Reflect.ownKeys(global).includes("Crypto"));
								`;

							const result = await runBoxed({ strategy, permissions, src });

							assertSuccess(result);
							assertStdout(result, "Crypto is defined: false");
						});
					}
				});
			});

			await t.test("CryptoKey global", async (t) => {
				await t.test("ambient access", async (t) => {
					await t.test("strategy: exit", async () => {
						const strategy = STRATEGIES.exit;
						const src = `
								console.log("CryptoKey is defined:", CryptoKey.foobar === undefined);
							`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStdout(result, /using 'CryptoKey' is not allowed/);
					});

					await t.test("strategy: log", async () => {
						const strategy = STRATEGIES.log;
						const src = `
								console.log("CryptoKey is defined:", CryptoKey.foobar === undefined);
							`;

						const result = await runBoxed({ strategy, permissions, src });

						assertSuccess(result);
						assertStdout(result, /using 'CryptoKey' is not allowed/);
						assertStdout(result, /CryptoKey is defined: true/);
					});

					await t.test("strategy: throw", async () => {
						const strategy = STRATEGIES.throw;
						const src = `
								console.log("CryptoKey is defined:", CryptoKey.foobar === undefined);
							`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStderr(result, /using 'CryptoKey' is not allowed/);
					});
				});

				await t.test("globalThis access", async (t) => {
					await t.test("strategy: exit", async () => {
						const strategy = STRATEGIES.exit;
						const src = `
								console.log("CryptoKey is defined:", globalThis.CryptoKey.foobar === undefined);
							`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStdout(result, /using 'CryptoKey' is not allowed/);
					});

					await t.test("strategy: log", async () => {
						const strategy = STRATEGIES.log;
						const src = `
								console.log("CryptoKey is defined:", globalThis.CryptoKey.foobar === undefined);
							`;

						const result = await runBoxed({ strategy, permissions, src });

						assertSuccess(result);
						assertStdout(result, /using 'CryptoKey' is not allowed/);
						assertStdout(result, /CryptoKey is defined: true/);
					});

					await t.test("strategy: throw", async () => {
						const strategy = STRATEGIES.throw;
						const src = `
								console.log("CryptoKey is defined:", globalThis.CryptoKey.foobar === undefined);
							`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStderr(result, /Error: using 'CryptoKey' is not allowed/);
					});
				});

				await t.test("globalThis has", async (t) => {
					for (const strategy of Object.values(STRATEGIES)) {
						await t.test(`strategy: ${strategy.description}`, async () => {
							const strategy = STRATEGIES.exit;
							const src = `
									console.log("CryptoKey is defined:", "CryptoKey" in globalThis);
								`;

							const result = await runBoxed({ strategy, permissions, src });

							assertSuccess(result);
							assertStdout(result, "CryptoKey is defined: false");
						});
					}
				});

				await t.test("globalThis keys", async (t) => {
					for (const strategy of Object.values(STRATEGIES)) {
						await t.test(`strategy: ${strategy.description}`, async () => {
							const src = `
									console.log("CryptoKey is defined:", Reflect.ownKeys(globalThis).includes("CryptoKey"));
								`;

							const result = await runBoxed({ strategy, permissions, src });

							assertSuccess(result);
							assertStdout(result, "CryptoKey is defined: false");
						});
					}
				});

				await t.test("global access", async (t) => {
					await t.test("strategy: exit", async () => {
						const strategy = STRATEGIES.exit;
						const src = `
								console.log("CryptoKey is defined:", global.CryptoKey.foobar === undefined);
							`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStdout(result, /using 'CryptoKey' is not allowed/);
					});

					await t.test("strategy: log", async () => {
						const strategy = STRATEGIES.log;
						const src = `
								console.log("CryptoKey is defined:", global.CryptoKey.foobar === undefined);
							`;

						const result = await runBoxed({ strategy, permissions, src });

						assertSuccess(result);
						assertStdout(result, /using 'CryptoKey' is not allowed/);
						assertStdout(result, /CryptoKey is defined: true/);
					});

					await t.test("strategy: throw", async () => {
						const strategy = STRATEGIES.throw;
						const src = `
								console.log("CryptoKey is defined:", global.CryptoKey.foobar === undefined);
							`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStderr(result, /Error: using 'CryptoKey' is not allowed/);
					});
				});

				await t.test("global has", async (t) => {
					for (const strategy of Object.values(STRATEGIES)) {
						await t.test(`strategy: ${strategy.description}`, async () => {
							const strategy = STRATEGIES.exit;
							const src = `
									console.log("CryptoKey is defined:", "CryptoKey" in global);
								`;

							const result = await runBoxed({ strategy, permissions, src });

							assertSuccess(result);
							assertStdout(result, "CryptoKey is defined: false");
						});
					}
				});

				await t.test("global keys", async (t) => {
					for (const strategy of Object.values(STRATEGIES)) {
						await t.test(`strategy: ${strategy.description}`, async () => {
							const src = `
									console.log("CryptoKey is defined:", Reflect.ownKeys(global).includes("CryptoKey"));
								`;

							const result = await runBoxed({ strategy, permissions, src });

							assertSuccess(result);
							assertStdout(result, "CryptoKey is defined: false");
						});
					}
				});
			});

			await t.test("SubtleCrypto global", async (t) => {
				await t.test("ambient access", async (t) => {
					await t.test("strategy: exit", async () => {
						const strategy = STRATEGIES.exit;
						const src = `
								console.log("SubtleCrypto is defined:", SubtleCrypto.foobar === undefined);
							`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStdout(result, /using 'SubtleCrypto' is not allowed/);
					});

					await t.test("strategy: log", async () => {
						const strategy = STRATEGIES.log;
						const src = `
								console.log("SubtleCrypto is defined:", SubtleCrypto.foobar === undefined);
							`;

						const result = await runBoxed({ strategy, permissions, src });

						assertSuccess(result);
						assertStdout(result, /using 'SubtleCrypto' is not allowed/);
						assertStdout(result, /SubtleCrypto is defined: true/);
					});

					await t.test("strategy: throw", async () => {
						const strategy = STRATEGIES.throw;
						const src = `
								console.log("SubtleCrypto is defined:", SubtleCrypto.foobar === undefined);
							`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStderr(result, /using 'SubtleCrypto' is not allowed/);
					});
				});

				await t.test("globalThis access", async (t) => {
					await t.test("strategy: exit", async () => {
						const strategy = STRATEGIES.exit;
						const src = `
								console.log("SubtleCrypto is defined:", globalThis.SubtleCrypto.foobar === undefined);
							`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStdout(result, /using 'SubtleCrypto' is not allowed/);
					});

					await t.test("strategy: log", async () => {
						const strategy = STRATEGIES.log;
						const src = `
								console.log("SubtleCrypto is defined:", globalThis.SubtleCrypto.foobar === undefined);
							`;

						const result = await runBoxed({ strategy, permissions, src });

						assertSuccess(result);
						assertStdout(result, /using 'SubtleCrypto' is not allowed/);
						assertStdout(result, /SubtleCrypto is defined: true/);
					});

					await t.test("strategy: throw", async () => {
						const strategy = STRATEGIES.throw;
						const src = `
								console.log("SubtleCrypto is defined:", globalThis.SubtleCrypto.foobar === undefined);
							`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStderr(result, /Error: using 'SubtleCrypto' is not allowed/);
					});
				});

				await t.test("globalThis has", async (t) => {
					for (const strategy of Object.values(STRATEGIES)) {
						await t.test(`strategy: ${strategy.description}`, async () => {
							const strategy = STRATEGIES.exit;
							const src = `
									console.log("SubtleCrypto is defined:", "SubtleCrypto" in globalThis);
								`;

							const result = await runBoxed({ strategy, permissions, src });

							assertSuccess(result);
							assertStdout(result, "SubtleCrypto is defined: false");
						});
					}
				});

				await t.test("globalThis keys", async (t) => {
					for (const strategy of Object.values(STRATEGIES)) {
						await t.test(`strategy: ${strategy.description}`, async () => {
							const src = `
									console.log("SubtleCrypto is defined:", Reflect.ownKeys(globalThis).includes("SubtleCrypto"));
								`;

							const result = await runBoxed({ strategy, permissions, src });

							assertSuccess(result);
							assertStdout(result, "SubtleCrypto is defined: false");
						});
					}
				});

				await t.test("global access", async (t) => {
					await t.test("strategy: exit", async () => {
						const strategy = STRATEGIES.exit;
						const src = `
								console.log("SubtleCrypto is defined:", global.SubtleCrypto.foobar === undefined);
							`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStdout(result, /using 'SubtleCrypto' is not allowed/);
					});

					await t.test("strategy: log", async () => {
						const strategy = STRATEGIES.log;
						const src = `
								console.log("SubtleCrypto is defined:", global.SubtleCrypto.foobar === undefined);
							`;

						const result = await runBoxed({ strategy, permissions, src });

						assertSuccess(result);
						assertStdout(result, /using 'SubtleCrypto' is not allowed/);
						assertStdout(result, /SubtleCrypto is defined: true/);
					});

					await t.test("strategy: throw", async () => {
						const strategy = STRATEGIES.throw;
						const src = `
								console.log("SubtleCrypto is defined:", global.SubtleCrypto.foobar === undefined);
							`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStderr(result, /Error: using 'SubtleCrypto' is not allowed/);
					});
				});

				await t.test("global has", async (t) => {
					for (const strategy of Object.values(STRATEGIES)) {
						await t.test(`strategy: ${strategy.description}`, async () => {
							const strategy = STRATEGIES.exit;
							const src = `
									console.log("SubtleCrypto is defined:", "SubtleCrypto" in global);
								`;

							const result = await runBoxed({ strategy, permissions, src });

							assertSuccess(result);
							assertStdout(result, "SubtleCrypto is defined: false");
						});
					}
				});

				await t.test("global keys", async (t) => {
					for (const strategy of Object.values(STRATEGIES)) {
						await t.test(`strategy: ${strategy.description}`, async () => {
							const src = `
									console.log("SubtleCrypto is defined:", Reflect.ownKeys(global).includes("SubtleCrypto"));
								`;

							const result = await runBoxed({ strategy, permissions, src });

							assertSuccess(result);
							assertStdout(result, "SubtleCrypto is defined: false");
						});
					}
				});
			});
		});
	});

	await t.test("network", async (t) => {
		await t.test("allowed", async (t) => {
			const permissions = {
				...defaultPermissions,
				network: true,
				import: {
					packages: [
						"node:dns",
						"dns",
						"node:dns/promises",
						"dns/promises",
						"node:http",
						"http",
						"node:https",
						"https",
						"node:http2",
						"http2",
						"node:net",
						"net",
					],
					files: [],
				},
			};

			await t.test("import", async (t) => {
				const testCases = [
					"node:dns",
					"dns",
					"node:dns/promises",
					"dns/promises",
					"node:http",
					"http",
					"node:https",
					"https",
					"node:http2",
					"http2",
					"node:net",
					"net",
				];

				for (const testCase of testCases) {
					await t.test(`require - '${testCase}'`, async () => {
						const src = `
							const got = require("${testCase}");
							console.log("import worked:", got !== undefined);
						`;

						const result = await runBoxed({ strategy, permissions, src });

						assertSuccess(result);
						assertStdout(result, "import worked: true");
					});

					await t.test(
						`process.mainModule.require - '${testCase}'`,
						async () => {
							const permissions2 = {
								...permissions,
								process: true,
							};

							const src = `
							const got = process.mainModule.require("${testCase}");
							console.log("import worked:", got !== undefined);
						`;

							const result = await runBoxed({
								strategy,
								permissions: permissions2,
								src,
							});

							assertSuccess(result);
							assertStdout(result, "import worked: true");
						},
					);

					await t.test(`import - '${testCase}'`, async () => {
						const src = `
							(async () => {
								const got = await import("${testCase}");
								console.log("import worked:", got !== undefined);
							})();
						`;

						const result = await runBoxed({ strategy, permissions, src });

						assertSuccess(result);
						assertStdout(result, "import worked: true");
					});
				}
			});

			await t.test("fetch global", async (t) => {
				await t.test("ambient access", async () => {
					const src = `
						console.log("fetch is defined:", fetch('http://localhost:1337').catch(() => {}) !== undefined);
					`;

					const result = await runBoxed({ strategy, permissions, src });

					assertSuccess(result);
					assertStdout(result, "fetch is defined: true");
				});

				await t.test("globalThis access", async () => {
					const src = `
						console.log("fetch is defined:", globalThis.fetch('http://localhost:1337').catch(() => {}) !== undefined);
					`;

					const result = await runBoxed({ strategy, permissions, src });

					assertSuccess(result);
					assertStdout(result, "fetch is defined: true");
				});

				await t.test("globalThis has", async () => {
					const src = `
						console.log("fetch is defined:", "fetch" in globalThis);
					`;

					const result = await runBoxed({ strategy, permissions, src });

					assertSuccess(result);
					assertStdout(result, "fetch is defined: true");
				});

				await t.test("globalThis keys", async () => {
					const src = `
						console.log("fetch is defined:", Reflect.ownKeys(globalThis).includes("fetch"));
					`;

					const result = await runBoxed({ strategy, permissions, src });

					assertSuccess(result);
					assertStdout(result, "fetch is defined: true");
				});

				await t.test("global access", async () => {
					const src = `
						console.log("fetch is defined:", global.fetch('http://localhost:1337').catch(() => {}) !== undefined);
					`;

					const result = await runBoxed({ strategy, permissions, src });

					assertSuccess(result);
					assertStdout(result, "fetch is defined: true");
				});

				await t.test("global has", async () => {
					const src = `
						console.log("fetch is defined:", "fetch" in global);
					`;

					const result = await runBoxed({ strategy, permissions, src });

					assertSuccess(result);
					assertStdout(result, "fetch is defined: true");
				});

				await t.test("global keys", async () => {
					const src = `
						console.log("fetch is defined:", Reflect.ownKeys(global).includes("fetch"));
					`;

					const result = await runBoxed({ strategy, permissions, src });

					assertSuccess(result);
					assertStdout(result, "fetch is defined: true");
				});
			});
		});

		await t.test("disallowed", async (t) => {
			const permissions = {
				...defaultPermissions,
				network: false,
			};

			await t.test("import", async (t) => {
				const testCases = [
					"node:dns",
					"dns",
					"node:dns/promises",
					"dns/promises",
					"node:http",
					"http",
					"node:https",
					"https",
					"node:http2",
					"http2",
					"node:net",
					"net",
				];

				for (const testCase of testCases) {
					await t.test(`require - '${testCase}'`, async () => {
						const src = `
							const got = require("${testCase}");
							console.log("import worked:", got !== undefined);
						`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStderr(
							result,
							new RegExp(`Error: using '${testCase}' is not allowed`),
						);
					});

					await t.test(
						`process.mainModule.require - '${testCase}'`,
						async () => {
							const permissions2 = {
								...permissions,
								process: true,
							};
							const src = `
							const got = process.mainModule.require("${testCase}");
							console.log("import worked:", got !== undefined);
						`;

							const result = await runBoxed({
								strategy,
								permissions: permissions2,
								src,
							});

							assertFailure(result);
							assertStderr(
								result,
								new RegExp(`Error: using '${testCase}' is not allowed`),
							);
						},
					);

					await t.test(`import - '${testCase}'`, async () => {
						const src = `
							(async () => {
								const got = await import("${testCase}");
								console.log("import worked:", got !== undefined);
							})();
						`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStderr(
							result,
							new RegExp(`Error: using '${testCase}' is not allowed`),
						);
					});
				}
			});

			await t.test("fetch global", async (t) => {
				await t.test("ambient access", async (t) => {
					await t.test("strategy: exit", async () => {
						const strategy = STRATEGIES.exit;
						const src = `
							console.log("fetch is defined:", fetch('http://localhost:1337').catch(() => {}) !== undefined);
						`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStdout(result, /using 'fetch' is not allowed/);
					});

					await t.test("strategy: log", async () => {
						const strategy = STRATEGIES.log;
						const src = `
							console.log("fetch is defined:", fetch('http://localhost:1337').catch(() => {}) !== undefined);
						`;

						const result = await runBoxed({ strategy, permissions, src });

						assertSuccess(result);
						assertStdout(result, /using 'fetch' is not allowed/);
						assertStdout(result, /fetch is defined: true/);
					});

					await t.test("strategy: throw", async () => {
						const strategy = STRATEGIES.throw;
						const src = `
							console.log("fetch is defined:", fetch('http://localhost:1337').catch(() => {}) !== undefined);
						`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStderr(result, /Error: using 'fetch' is not allowed/);
					});
				});

				await t.test("globalThis access", async (t) => {
					await t.test("strategy: exit", async () => {
						const strategy = STRATEGIES.exit;
						const src = `
							console.log("fetch is defined:", globalThis.fetch('http://localhost:1337').catch(() => {}) !== undefined);
						`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStdout(result, /using 'fetch' is not allowed/);
					});

					await t.test("strategy: log", async () => {
						const strategy = STRATEGIES.log;
						const src = `
							console.log("fetch is defined:", globalThis.fetch('http://localhost:1337').catch(() => {}) !== undefined);
						`;

						const result = await runBoxed({ strategy, permissions, src });

						assertSuccess(result);
						assertStdout(result, /using 'fetch' is not allowed/);
						assertStdout(result, /fetch is defined: true/);
					});

					await t.test("strategy: throw", async () => {
						const strategy = STRATEGIES.throw;
						const src = `
							console.log("fetch is defined:", globalThis.fetch('http://localhost:1337').catch(() => {}) !== undefined);
						`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStderr(result, /Error: using 'fetch' is not allowed/);
					});
				});

				await t.test("globalThis has", async (t) => {
					for (const strategy of Object.values(STRATEGIES)) {
						await t.test(`strategy: ${strategy.description}`, async () => {
							const strategy = STRATEGIES.exit;
							const src = `
								console.log("fetch is defined:", "fetch" in globalThis);
							`;

							const result = await runBoxed({ strategy, permissions, src });

							assertSuccess(result);
							assertStdout(result, "fetch is defined: false");
						});
					}
				});

				await t.test("globalThis keys", async (t) => {
					for (const strategy of Object.values(STRATEGIES)) {
						await t.test(`strategy: ${strategy.description}`, async () => {
							const src = `
								console.log("fetch is defined:", Reflect.ownKeys(globalThis).includes("fetch"));
							`;

							const result = await runBoxed({ strategy, permissions, src });

							assertSuccess(result);
							assertStdout(result, "fetch is defined: false");
						});
					}
				});

				await t.test("global access", async (t) => {
					await t.test("strategy: exit", async () => {
						const strategy = STRATEGIES.exit;
						const src = `
						console.log("fetch is defined:", global.fetch('http://localhost:1337').catch(() => {}) !== undefined);
						`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStdout(result, /using 'fetch' is not allowed/);
					});

					await t.test("strategy: log", async () => {
						const strategy = STRATEGIES.log;
						const src = `
							console.log("fetch is defined:", global.fetch('http://localhost:1337').catch(() => {}) !== undefined);
						`;

						const result = await runBoxed({ strategy, permissions, src });

						assertSuccess(result);
						assertStdout(result, /using 'fetch' is not allowed/);
						assertStdout(result, /fetch is defined: true/);
					});

					await t.test("strategy: throw", async () => {
						const strategy = STRATEGIES.throw;
						const src = `
							console.log("fetch is defined:", global.fetch('http://localhost:1337').catch(() => {}) !== undefined);
						`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStderr(result, /Error: using 'fetch' is not allowed/);
					});
				});

				await t.test("global has", async (t) => {
					for (const strategy of Object.values(STRATEGIES)) {
						await t.test(`strategy: ${strategy.description}`, async () => {
							const strategy = STRATEGIES.exit;
							const src = `
								console.log("fetch is defined:", "fetch" in global);
							`;

							const result = await runBoxed({ strategy, permissions, src });

							assertSuccess(result);
							assertStdout(result, "fetch is defined: false");
						});
					}
				});

				await t.test("global keys", async (t) => {
					for (const strategy of Object.values(STRATEGIES)) {
						await t.test(`strategy: ${strategy.description}`, async () => {
							const src = `
								console.log("fetch is defined:", Reflect.ownKeys(global).includes("fetch"));
							`;

							const result = await runBoxed({ strategy, permissions, src });

							assertSuccess(result);
							assertStdout(result, "fetch is defined: false");
						});
					}
				});
			});
		});
	});

	await t.test("process", async (t) => {
		await t.test("allowed", async (t) => {
			const permissions = {
				...defaultPermissions,
				process: true,
				import: {
					packages: ["node:process", "process"],
					files: [],
				},
			};

			await t.test("import", async (t) => {
				const testCases = ["node:process", "process"];

				for (const testCase of testCases) {
					await t.test(`require - '${testCase}'`, async () => {
						const src = `
							const got = require("${testCase}");
							console.log("import worked:", got !== undefined);
						`;

						const result = await runBoxed({ strategy, permissions, src });

						assertSuccess(result);
						assertStdout(result, "import worked: true");
					});

					await t.test(
						`process.mainModule.require - '${testCase}'`,
						async () => {
							const src = `
							const got = process.mainModule.require("${testCase}");
							console.log("import worked:", got !== undefined);
						`;

							const result = await runBoxed({ strategy, permissions, src });

							assertSuccess(result);
							assertStdout(result, "import worked: true");
						},
					);

					await t.test(`import - '${testCase}'`, async () => {
						const src = `
							(async () => {
								const got = await import("${testCase}");
								console.log("import worked:", got !== undefined);
							})();
						`;

						const result = await runBoxed({ strategy, permissions, src });

						assertSuccess(result);
						assertStdout(result, "import worked: true");
					});
				}
			});

			await t.test("process global", async (t) => {
				await t.test("ambient access", async () => {
					const src = `
						console.log("process is defined:", process !== undefined);
					`;

					const result = await runBoxed({ strategy, permissions, src });

					assertSuccess(result);
					assertStdout(result, "process is defined: true");
				});

				await t.test("globalThis access", async () => {
					const src = `
						console.log("process is defined:", globalThis.process !== undefined);
					`;

					const result = await runBoxed({ strategy, permissions, src });

					assertSuccess(result);
					assertStdout(result, "process is defined: true");
				});

				await t.test("globalThis has", async () => {
					const src = `
						console.log("process is defined:", "process" in globalThis);
					`;

					const result = await runBoxed({ strategy, permissions, src });

					assertSuccess(result);
					assertStdout(result, "process is defined: true");
				});

				await t.test("globalThis keys", async () => {
					const src = `
						console.log("process is defined:", Reflect.ownKeys(globalThis).includes("process"));
					`;

					const result = await runBoxed({ strategy, permissions, src });

					assertSuccess(result);
					assertStdout(result, "process is defined: true");
				});

				await t.test("global access", async () => {
					const src = `
						console.log("process is defined:", global.process !== undefined);
					`;

					const result = await runBoxed({ strategy, permissions, src });

					assertSuccess(result);
					assertStdout(result, "process is defined: true");
				});

				await t.test("global has", async () => {
					const src = `
						console.log("process is defined:", "process" in global);
					`;

					const result = await runBoxed({ strategy, permissions, src });

					assertSuccess(result);
					assertStdout(result, "process is defined: true");
				});

				await t.test("global keys", async () => {
					const src = `
						console.log("process is defined:", Reflect.ownKeys(global).includes("process"));
					`;

					const result = await runBoxed({ strategy, permissions, src });

					assertSuccess(result);
					assertStdout(result, "process is defined: true");
				});

				await t.test("mainModule.require", async () => {
					const src = `
						console.log("require is defined:", process.mainModule.require !== undefined);
					`;

					const result = await runBoxed({ strategy, permissions, src });

					assertSuccess(result);
					assertStdout(result, "require is defined: true");
				});
			});
		});

		await t.test("disallowed", async (t) => {
			const permissions = {
				...defaultPermissions,
				process: false,
			};

			await t.test("import", async (t) => {
				const testCases = ["node:process", "process"];

				for (const testCase of testCases) {
					await t.test(`require - '${testCase}'`, async () => {
						const src = `
							const got = require("${testCase}");
							console.log("import worked:", got !== undefined);
						`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStderr(
							result,
							new RegExp(`Error: using '${testCase}' is not allowed`),
						);
					});

					await t.test(
						`process.mainModule.require - '${testCase}'`,
						async () => {
							const src = `
							const got = process.mainModule.require("${testCase}");
							console.log("import worked:", got !== undefined);
						`;

							const result = await runBoxed({ strategy, permissions, src });

							assertFailure(result);
							assertStderr(result, /using 'process' is not allowed/);
						},
					);

					await t.test(`import - '${testCase}'`, async () => {
						const src = `
							(async () => {
								const got = await import("${testCase}");
								console.log("import worked:", got !== undefined);
							})();
						`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStderr(
							result,
							new RegExp(`Error: using '${testCase}' is not allowed`),
						);
					});
				}
			});

			await t.test("process global", async (t) => {
				await t.test("ambient access", async (t) => {
					await t.test("strategy: exit", async () => {
						const strategy = STRATEGIES.exit;
						const src = `
							console.log("process is defined:", process.argv !== undefined);
						`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStdout(result, /using 'process' is not allowed/);
					});

					await t.test("strategy: log", async () => {
						const strategy = STRATEGIES.log;
						const src = `
							console.log("process is defined:", process.argv !== undefined);
						`;

						const result = await runBoxed({ strategy, permissions, src });

						assertSuccess(result);
						assertStdout(result, /using 'process' is not allowed/);
						assertStdout(result, /process is defined: true/);
					});

					await t.test("strategy: throw", async () => {
						const strategy = STRATEGIES.throw;
						const src = `
							console.log("process is defined:", process.argv !== undefined);
						`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStderr(result, /using 'process' is not allowed/);
					});
				});

				await t.test("globalThis access", async (t) => {
					await t.test("strategy: exit", async () => {
						const strategy = STRATEGIES.exit;
						const src = `
							console.log("process is defined:", globalThis.process.argv !== undefined);
						`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStdout(result, /using 'process' is not allowed/);
					});

					await t.test("strategy: log", async () => {
						const strategy = STRATEGIES.log;
						const src = `
							console.log("process is defined:", globalThis.process.argv !== undefined);
						`;

						const result = await runBoxed({ strategy, permissions, src });

						assertSuccess(result);
						assertStdout(result, /using 'process' is not allowed/);
						assertStdout(result, /process is defined: true/);
					});

					await t.test("strategy: throw", async () => {
						const strategy = STRATEGIES.throw;
						const src = `
							console.log("process is defined:", globalThis.process.argv !== undefined);
						`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStderr(result, /Error: using 'process' is not allowed/);
					});
				});

				await t.test("globalThis has", async (t) => {
					for (const strategy of Object.values(STRATEGIES)) {
						await t.test(`strategy: ${strategy.description}`, async () => {
							const strategy = STRATEGIES.exit;
							const src = `
								console.log("process is defined:", "process" in globalThis);
							`;

							const result = await runBoxed({ strategy, permissions, src });

							assertSuccess(result);
							assertStdout(result, "process is defined: false");
						});
					}
				});

				await t.test("globalThis keys", async (t) => {
					for (const strategy of Object.values(STRATEGIES)) {
						await t.test(`strategy: ${strategy.description}`, async () => {
							const src = `
								console.log("process is defined:", Reflect.ownKeys(globalThis).includes("process"));
							`;

							const result = await runBoxed({ strategy, permissions, src });

							assertSuccess(result);
							assertStdout(result, "process is defined: false");
						});
					}
				});

				await t.test("global access", async (t) => {
					await t.test("strategy: exit", async () => {
						const strategy = STRATEGIES.exit;
						const src = `
							console.log("process is defined:", global.process.argv !== undefined);
						`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStdout(result, /using 'process' is not allowed/);
					});

					await t.test("strategy: log", async () => {
						const strategy = STRATEGIES.log;
						const src = `
							console.log("process is defined:", global.process.argv !== undefined);
						`;

						const result = await runBoxed({ strategy, permissions, src });

						assertSuccess(result);
						assertStdout(result, /using 'process' is not allowed/);
						assertStdout(result, /process is defined: true/);
					});

					await t.test("strategy: throw", async () => {
						const strategy = STRATEGIES.throw;
						const src = `
							console.log("process is defined:", global.process.argv !== undefined);
						`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStderr(result, /Error: using 'process' is not allowed/);
					});
				});

				await t.test("global has", async (t) => {
					for (const strategy of Object.values(STRATEGIES)) {
						await t.test(`strategy: ${strategy.description}`, async () => {
							const strategy = STRATEGIES.exit;
							const src = `
								console.log("process is defined:", "process" in global);
							`;

							const result = await runBoxed({ strategy, permissions, src });

							assertSuccess(result);
							assertStdout(result, "process is defined: false");
						});
					}
				});

				await t.test("global keys", async (t) => {
					for (const strategy of Object.values(STRATEGIES)) {
						await t.test(`strategy: ${strategy.description}`, async () => {
							const src = `
								console.log("process is defined:", Reflect.ownKeys(global).includes("process"));
							`;

							const result = await runBoxed({ strategy, permissions, src });

							assertSuccess(result);
							assertStdout(result, "process is defined: false");
						});
					}
				});
			});
		});
	});
});

test("breakout", async (t) => {
	const strategy = defaultStrategy;
	const permissions = defaultPermissions;

	const breakouts = [
		{
			name: "host object constructor",
			eval: (script) => {
				return `
					const __breakout__ = Object.constructor.constructor;
					const __script__ = __breakout__(\`${embed(script)}\`);
					const result = __script__();
				`;
			},
		},
	];

	for (const breakout of breakouts) {
		await t.test(breakout.name, async (t) => {
			await t.test("allowed", async (t) => {
				const testCasesLiterals = [
					{ code: "undefined", printed: "undefined" },
					{ code: "null", printed: "null" },
					{ code: "NaN", printed: "NaN" },
					{ code: "Infinity", printed: "Infinity" },
					{ code: "-Infinity", printed: "-Infinity" },
					{ code: "false", printed: "false" },
					{ code: "true", printed: "true" },
					{ code: "42", printed: "42" },
					{ code: "3.14", printed: "3.14" },
					{ code: "9001n", printed: "9001" },
					{ code: "'foobar'", printed: "foobar" },
				];

				const testCasesNonLiteral = [
					{ code: "this", printed: "[object global]" },
				];

				const testCases = [...testCasesLiterals, ...testCasesNonLiteral];

				for (const testCase of testCases) {
					const { code, printed } = testCase;

					await t.test(`access ${code}`, async () => {
						const src = `
							${breakout.eval(`return ${code};`)}
							console.log("The result is: " + result);
						`;

						const result = await runBoxed({ strategy, permissions, src });

						assertSuccess(result);
						assertStdout(result, `The result is: ${printed}`);
					});
				}

				await t.test("dynamic import", async (t) => {
					await t.test("in policy", async () => {
						const permissions = {
							...defaultPermissions,
							import: {
								packages: ["node:constants"],
								files: [],
							},
						};

						const src = `
							${breakout.eval(`return import("node:constants");`)}
							console.log("The result is: " + result);
						`;

						const result = await runBoxed({ strategy, permissions, src });

						assertSuccess(result);
						assertStdout(result, "The result is: [object Promise]");
					});
				});
			});

			await t.test("disallowed", async (t) => {
				const testCasesGlobals = [
					"fetch",
					"process",
					"require",
					"Crypto",
					"crypto",
					"CryptoKey",
					"SubtleCrypto",
					"Reflect",
				];

				const testCasesTool = ["flag"];

				const testCases = [...testCasesGlobals, ...testCasesTool];

				for (const testCase of testCases) {
					await t.test(`access ${testCase}`, async () => {
						const src = `
							${breakout.eval(`return ${testCase};`)}
							console.log("The result is: " + result);
						`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStderr(
							result,
							new RegExp(`ReferenceError: ${testCase} is not defined`),
						);
					});

					await t.test(`access globalThis.${testCase}`, async () => {
						const src = `
							${breakout.eval(`return globalThis.${testCase};`)}
							console.log("The result is: " + result);
						`;

						const result = await runBoxed({ strategy, permissions, src });

						assertSuccess(result);
						assertStdout(result, "The result is: undefined");
					});

					await t.test(`access global.${testCase}`, async () => {
						const src = `
							${breakout.eval(`return global.${testCase};`)}
							console.log("The result is: " + result);
						`;

						const result = await runBoxed({ strategy, permissions, src });

						assertSuccess(result);
						assertStdout(result, "The result is: undefined");
					});

					await t.test(`access this.${testCase}`, async () => {
						const src = `
							${breakout.eval(`return this.${testCase};`)}
							console.log("The result is: " + result);
						`;

						const result = await runBoxed({ strategy, permissions, src });

						assertSuccess(result);
						assertStdout(result, "The result is: undefined");
					});
				}

				await t.test("static import", async () => {
					const permissions = {
						...defaultPermissions,
						import: {
							packages: ["node:constants"],
							files: [],
						},
					};

					const src = `
						${breakout.eval(`import "node:constants"`)}
						console.log("The result is: " + result);
					`;

					const result = await runBoxed({ strategy, permissions, src });

					assertFailure(result);
					assertStderr(
						result,
						/SyntaxError: Cannot use import statement outside a module/,
					);
				});

				await t.test("dynamic import", async (t) => {
					await t.test("out of policy", async () => {
						const permissions = {
							...defaultPermissions,
							import: {
								packages: [],
								files: [],
							},
						};

						const src = `
							${breakout.eval(`return import("acorn");`)}
							console.log("The result is: " + result);
						`;

						const result = await runBoxed({ strategy, permissions, src });

						assertFailure(result);
						assertStderr(result, /Error: using 'acorn' is not allowed/);
					});
				});
			});

			await t.test("leakage", async (t) => {
				await t.test("reference error", async (t) => {
					await t.test("local variable names are not revealed", async () => {
						const src = `
							try {
								${breakout.eval(`notDefined`)}
							} catch (error) {
								console.log(error);
							}
						`;

						const result = await runBoxed({ strategy, permissions, src });

						assertStdout(
							result,
							/^ReferenceError: notDefined is not defined\s+at/,
						);
					});
				});
			});
		});
	}
});

test("(node:)module", async (t) => {
	const strategy = defaultStrategy;
	const permissions = {
		...defaultPermissions,
		import: {
			packages: ["node:module", "module"],
			files: [],
		},
	};

	for (const name of ["node:module", "module"]) {
		await t.test(`as ${name}`, async (t) => {
			await t.test("createRequire", async (t) => {
				await t.test("require in policy", async () => {
					const src = `
						const mod = require("${name}");
						const require2 = mod.createRequire(__filename);
						const got = require2("node:module");
						console.log("import worked:", got !== undefined);
					`;

					const result = await runBoxed({ strategy, permissions, src });

					assertSuccess(result);
					assertStdout(result, "import worked: true");
				});

				await t.test("require out of policy", async () => {
					const src = `
						const mod = require("${name}");
						const require2 = mod.createRequire(__filename);
						const got = require2("not-allowed");
						console.log("import worked:", got !== undefined);
					`;

					const result = await runBoxed({ strategy, permissions, src });

					assertFailure(result);
					assertStderr(result, /Error: using 'not-allowed' is not allowed/);
				});
			});
		});
	}
});

test("correctness", async (t) => {
	const strategy = defaultStrategy;

	const evalPermissions = {
		...defaultPermissions,
		code: true,
	};

	const testCasesGlobals = [
		// Ambient access
		...[
			{
				name: "ambient access to a non-existent global variable",
				inp: {
					source: `console.log(definitelyNotAnGlobalVariableName);`,
					permissions: defaultPermissions,
				},
				out: {
					success: false,
					stderr:
						/ReferenceError: definitelyNotAnGlobalVariableName is not defined/,
				},
			},
			{
				name: "ambient access to a JavaScript global",
				inp: {
					source: `console.log(typeof isNaN);`,
					permissions: defaultPermissions,
				},
				out: {
					success: true,
					stdout: "function",
				},
			},
			{
				name: "ambient access to a Node.js global",
				inp: {
					source: `console.log(typeof clearImmediate);`,
					permissions: defaultPermissions,
				},
				out: {
					success: true,
					stdout: "function",
				},
			},
			{
				name: "ambient access to a custom global",
				inp: {
					source: `
						globalThis.foo = "bar";
						console.log(foo);
					`,
					permissions: defaultPermissions,
				},
				out: {
					success: true,
					stdout: "bar",
				},
			},
		],

		// globalThis access
		...[
			{
				name: "globalThis access to a non-existent global variable",
				inp: {
					source: `console.log(globalThis.definitelyNotAnGlobalVariableName);`,
					permissions: defaultPermissions,
				},
				out: {
					success: true,
					stdout: "undefined",
				},
			},
			{
				name: "globalThis access to a JavaScript global",
				inp: {
					source: `console.log(typeof globalThis.isNaN);`,
					permissions: defaultPermissions,
				},
				out: {
					success: true,
					stdout: "function",
				},
			},
			{
				name: "globalThis access to a Node.js global",
				inp: {
					source: `console.log(typeof globalThis.clearImmediate);`,
					permissions: defaultPermissions,
				},
				out: {
					success: true,
					stdout: "function",
				},
			},
			{
				name: "globalThis access to a custom global",
				inp: {
					source: `
						globalThis.foo = "bar";
						console.log(globalThis.foo);
					`,
					permissions: defaultPermissions,
				},
				out: {
					success: true,
					stdout: "bar",
				},
			},
		],

		// global access
		...[
			{
				name: "global access to a non-existent global variable",
				inp: {
					source: `console.log(global.definitelyNotAnGlobalVariableName);`,
					permissions: defaultPermissions,
				},
				out: {
					success: true,
					stdout: "undefined",
				},
			},
			{
				name: "global access to a JavaScript global",
				inp: {
					source: `console.log(typeof global.isNaN);`,
					permissions: defaultPermissions,
				},
				out: {
					success: true,
					stdout: "function",
				},
			},
			{
				name: "global access to a Node.js global",
				inp: {
					source: `console.log(typeof global.clearImmediate);`,
					permissions: defaultPermissions,
				},
				out: {
					success: true,
					stdout: "function",
				},
			},
			{
				name: "global access to a custom global",
				inp: {
					source: `
						globalThis.foo = "bar";
						console.log(global.foo);
					`,
					permissions: defaultPermissions,
				},
				out: {
					success: true,
					stdout: "bar",
				},
			},
		],

		// Ambient write/override
		...[
			{
				name: "ambient create a new global variable",
				inp: {
					source: `
						definitelyNotAnGlobalVariableName = "foobar";
						console.log(definitelyNotAnGlobalVariableName, globalThis.definitelyNotAnGlobalVariableName, global.definitelyNotAnGlobalVariableName);
					`,
					permissions: defaultPermissions,
				},
				out: {
					success: true,
					stdout: "foobar foobar foobar",
				},
			},
			{
				name: "ambient create a new global variable in strict mode",
				inp: {
					source: `
						"use strict";
						definitelyNotAnGlobalVariableName = "foobar";
						console.log(definitelyNotAnGlobalVariableName, globalThis.definitelyNotAnGlobalVariableName, global.definitelyNotAnGlobalVariableName);
					`,
					permissions: defaultPermissions,
				},
				out: {
					success: false,
					stderr:
						/ReferenceError: definitelyNotAnGlobalVariableName is not defined/,
				},
			},
			{
				name: "ambient override a JavaScript global",
				inp: {
					source: `
						isNaN = "bar";
						console.log(isNaN, globalThis.isNaN, global.isNaN);
					`,
					permissions: defaultPermissions,
				},
				out: {
					success: true,
					stdout: "bar bar bar",
				},
			},
			{
				name: "ambient override a Node.js global",
				inp: {
					source: `
						clearTimeout = "bar";
						console.log(clearTimeout, globalThis.clearTimeout, global.clearTimeout);
					`,
					permissions: defaultPermissions,
				},
				out: {
					success: true,
					stdout: "bar bar bar",
				},
			},
			{
				name: "ambient override 'globalThis'",
				inp: {
					source: `
						globalThis = "bar";
						console.log(typeof globalThis, typeof global);
					`,
					permissions: defaultPermissions,
				},
				out: {
					success: true,
					stdout: "string object",
				},
			},
			{
				name: "ambient override 'global'",
				inp: {
					source: `
						global = "bar";
						console.log(typeof globalThis, typeof global);
					`,
					permissions: defaultPermissions,
				},
				out: {
					success: true,
					stdout: "object string",
				},
			},
		],

		// globalThis write/override
		...[
			{
				name: "globalThis create a new global variable",
				inp: {
					source: `
						globalThis.foo = "bar";
						console.log(foo, globalThis.foo, global.foo);
					`,
					permissions: defaultPermissions,
				},
				out: {
					success: true,
					stdout: "bar bar bar",
				},
			},
			{
				name: "globalThis override a JavaScript global",
				inp: {
					source: `
						globalThis.isNaN = "bar";
						console.log(isNaN, globalThis.isNaN, global.isNaN);
					`,
					permissions: defaultPermissions,
				},
				out: {
					success: true,
					stdout: "bar bar bar",
				},
			},
			{
				name: "globalThis override a Node.js global",
				inp: {
					source: `
						globalThis.clearTimeout = "bar";
						console.log(clearTimeout, globalThis.clearTimeout, global.clearTimeout);
					`,
					permissions: defaultPermissions,
				},
				out: {
					success: true,
					stdout: "bar bar bar",
				},
			},
		],

		// global write/override
		...[
			{
				name: "global create a new global variable",
				inp: {
					source: `
						global.foo = "bar";
						console.log(foo, globalThis.foo, global.foo);
					`,
					permissions: defaultPermissions,
				},
				out: {
					success: true,
					stdout: "bar bar bar",
				},
			},
			{
				name: "global override a JavaScript global",
				inp: {
					source: `
						globalThis.isNaN = "bar";
						console.log(isNaN, globalThis.isNaN, global.isNaN);
					`,
					permissions: defaultPermissions,
				},
				out: {
					success: true,
					stdout: "bar bar bar",
				},
			},
			{
				name: "global override a Node.js global",
				inp: {
					source: `
						globalThis.clearTimeout = "bar";
						console.log(clearTimeout, globalThis.clearTimeout, global.clearTimeout);
					`,
					permissions: defaultPermissions,
				},
				out: {
					success: true,
					stdout: "bar bar bar",
				},
			},
		],
	];

	const testCasesEval = [
		// Ambient eval
		...[
			{
				name: "ambient eval using only literals",
				inp: {
					source: `
						const result = eval("1+1");
						console.log("the result is:", result);
					`,
					permissions: evalPermissions,
				},
				out: {
					success: true,
					stdout: "the result is: 2",
				},
			},
			{
				name: "ambient eval using a local variable",
				inp: {
					source: `
						const x = 2;
						const result = eval("x+1");
						console.log("the result is:", result);
					`,
					permissions: evalPermissions,
				},
				out: {
					success: true,
					stdout: "the result is: 3",
				},
			},
			{
				name: "ambient eval using a global variable",
				inp: {
					source: `
						const result = eval("isFinite(1)");
						console.log("the result is:", result);
					`,
					permissions: evalPermissions,
				},
				out: {
					success: true,
					stdout: "the result is: true",
				},
			},
		],

		// Ambient new Function
		...[
			{
				name: "ambient new Function using only literals",
				inp: {
					source: `
						const result = new Function("return 1+1")();
						console.log("the result is:", result);
					`,
					permissions: evalPermissions,
				},
				out: {
					success: true,
					stdout: "the result is: 2",
				},
			},
			{
				name: "ambient new Function using a global variable",
				inp: {
					source: `
						const result = new Function("return isFinite(1)")();
						console.log("the result is:", result);
					`,
					permissions: evalPermissions,
				},
				out: {
					success: true,
					stdout: "the result is: true",
				},
			},
		],

		// globalThis/global eval
		...[
			{
				name: "globalThis eval using only literals",
				inp: {
					source: `
						const result = globalThis.eval("1+1");
						console.log("the result is:", result);
					`,
					permissions: evalPermissions,
				},
				out: {
					success: true,
					stdout: "the result is: 2",
				},
			},
			{
				name: "globalThis eval using a global variable",
				inp: {
					source: `
						const result = globalThis.eval("isFinite(1)");
						console.log("the result is:", result);
					`,
					permissions: evalPermissions,
				},
				out: {
					success: true,
					stdout: "the result is: true",
				},
			},
		],

		// globalThis/global new Function
		...[
			{
				name: "globalThis new Function using only literals",
				inp: {
					source: `
						const result = new globalThis.Function("return 1+1")();
						console.log("the result is:", result);
					`,
					permissions: evalPermissions,
				},
				out: {
					success: true,
					stdout: "the result is: 2",
				},
			},
			{
				name: "globalThis new Function using a global variable",
				inp: {
					source: `
						const result = new globalThis.Function("return isFinite(1)")();
						console.log("the result is:", result);
					`,
					permissions: evalPermissions,
				},
				out: {
					success: true,
					stdout: "the result is: true",
				},
			},
		],
	];

	const testCasesMisc = [
		{
			name: "top-level return statement",
			inp: {
				source: `let x = true; if (x) { return; }`,
				permissions: defaultPermissions,
			},
			out: {
				success: true,
			},
		},
	];

	const testCases = [...testCasesGlobals, ...testCasesEval, ...testCasesMisc];

	for (const testCase of testCases) {
		const testName = testCase.name;

		const src = testCase.inp.source;
		const permissions = testCase.inp.permissions;

		const success = testCase.out.success;
		const stdout = testCase.out.stdout;
		const stderr = testCase.out.stderr;

		await t.test(testName, async () => {
			const result = await compare({ strategy, permissions, src });

			if (success === true) {
				assertSuccess(result);
			} else if (success === false) {
				assertFailure(result);
			} else {
				assert.fail(`out.success must be a boolean, got ${success}`);
			}

			if (stdout !== undefined) {
				assertStdout(result, stdout);
			}

			if (stderr !== undefined) {
				assertStderr(result, stderr);
			}
		});
	}
});

test("special headers", async (t) => {
	const strategy = defaultStrategy;
	const permissions = defaultPermissions;

	await t.test("use strict", async () => {
		const src = `
			"use strict";

			// assigning to a global that does not exist is allowed when strict mode
			// IS NOT enabled but errors if strict mode IS enabled.
			foobar = 17;
		`;

		const result = await runBoxed({ strategy, permissions, src });

		assertFailure(result);
	});

	await t.test("shebang", async () => {
		const src = `
			#!/usr/bin/env node
			console.log("Hello world!");
		`.trim();

		const result = await runBoxed({ strategy, permissions, src });

		assertSuccess(result);
		assertStdout(result, "Hello world!");
	});
});

const nameGenerator = names.create(names.generators.random);

async function runBoxed({ strategy, permissions, src }) {
	const workingDir = await fs.mkdtemp(path.join(os.tmpdir(), "s2s-test-"));
	const filename = "program.cjs";
	const filepath = path.join(workingDir, filename);

	const paths = {
		hiddenRel: ".",
		ogFileAbs: filepath,
		ogFile: filename,
		inRoot: "/tmp/foo",
		outRoot: "/tmp/bar",
		ogDirAbs: "/tmp/foo/app",
		outDirAbs: "/tmp/bar/app",
	};

	const boxCode = generateBoxCjs({
		names: nameGenerator,
		src,
		permissions,
		paths,
		strategy,
		file: filename,
	});

	await fs.writeFile(
		path.join(workingDir, "globals.cjs"),
		globalsProxy({ names: nameGenerator, esm: false }),
	);
	await fs.writeFile(
		path.join(workingDir, "module.cjs"),
		createModuleShimCodeCjs(),
	);
	await fs.writeFile(
		path.join(workingDir, "path.cjs"),
		createPathShimCodeCjs(),
	);
	await fs.writeFile(path.join(workingDir, "vm.cjs"), createVmShimCodeCjs());
	await fs.writeFile(filepath, boxCode);

	const result = cp.spawnSync(
		"node",
		[...NODE_CLI_OPTIONS({ disableEval: false }), filepath],
		{
			cwd: workingDir,
		},
	);

	fs.rm(workingDir, { recursive: true }).catch(() => {
		/*ignore*/
	});

	return {
		success: result.status === 0,
		stderr: result.stderr.toString(),
		stdout: result.stdout.toString(),
	};
}

async function runUnboxed({ src }) {
	const workingDir = await fs.mkdtemp(path.join(os.tmpdir(), "s2s-test-"));
	const filename = "program.cjs";
	const filepath = path.join(workingDir, filename);

	await fs.writeFile(filepath, src);

	const result = cp.spawnSync("node", [filepath], {
		cwd: workingDir,
	});

	fs.rm(workingDir, { recursive: true }).catch(() => {
		/*ignore*/
	});

	return {
		success: result.status === 0,
		stderr: result.stderr.toString(),
		stdout: result.stdout.toString(),
	};
}

async function compare({ strategy, permissions, src }) {
	const want = await runUnboxed({ src });
	const got = await runBoxed({ strategy, permissions, src });

	assertIdentical(got, want);
	return got;
}
