import { kPrimordials } from "./names.js";
import { STRATEGIES } from "../../policy.js";

const EXIT_CODE_VIOLATION = 42;

export function handleViolation({ name, strategy, what, who }) {
	const msg = `using '${what}' is not allowed in ${who}`;

	const thrower = `throw ${name.for(kPrimordials)}.NewError(\`${msg}\`);`;
	const logger = `${name.for(kPrimordials)}.ConsoleLog(\`[V] ${msg}\`);`;
	const exiter = `
		/// Log the violation before exiting
		${logger}
		/// Attempt exiting the program
		${name.for(kPrimordials)}.ProcessExit(${EXIT_CODE_VIOLATION});
		/// Fallback with a throw in case the exit is handled somehow
		${thrower}
	`;

	switch (strategy) {
		case STRATEGIES.exit:
			return exiter;
		case STRATEGIES.log:
			return logger;
		case STRATEGIES.throw:
			return thrower;
		default:
			throw new Error(`Unknown strategy ${strategy}`);
	}
}
