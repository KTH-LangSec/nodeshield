// FUTURE: implement log strategy for eval (and friends)

import { STRATEGIES } from "../../../policy.js";
import { handleViolation } from "../violation.js";
import { kFunction, kEval, kAllGlobals } from "../names.js";

export function generateEvalGlobal({ id, name, permissions, strategy }) {
	if (permissions.code) {
		return `return ${name.for(kEval)}`;
	}

	const trap = handleViolation({ name, strategy, what: "eval", who: id });
	switch (strategy) {
		case STRATEGIES.log:
			return `return ${name.for(kEval)}`;
		case STRATEGIES.throw:
		case STRATEGIES.exit:
			return `return function Eval() {${trap}}`;
		default:
			throw new Error(`Unknown strategy ${strategy}`);
	}
}

export function generateFunctionGlobal({ id, name, permissions, strategy }) {
	if (permissions.code) {
		return `return ${name.for(kFunction)}`;
	}

	const trap = handleViolation({ name, strategy, what: "Function", who: id });
	switch (strategy) {
		case STRATEGIES.log:
			return `return ${name.for(kFunction)}`;
		case STRATEGIES.throw:
		case STRATEGIES.exit:
			return `
				const f = function Function() {${trap}};
				f.prototype.apply = ${name.for(kAllGlobals)}.Function.prototype.apply;
				f.prototype.bind = ${name.for(kAllGlobals)}.Function.prototype.bind;
				f.prototype.call = ${name.for(kAllGlobals)}.Function.prototype.call;
				f.prototype[Symbol.hasInstance] = ${name.for(kAllGlobals)}.Function.prototype[Symbol.hasInstance];
				return f;
			`;
		default:
			throw new Error(`Unknown strategy ${strategy}`);
	}
}
