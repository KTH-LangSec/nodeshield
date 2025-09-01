const local = "foobar";

/**
 * The name of a local variable that exists in this scope.
 */
export const localVariableName = "local";

/**
 * Reference to `eval` from this scope.
 */
export const _eval = eval;

/**
 * Reference to the `Function` constructor from this scope.
 */
export const _Function = Function;

/**
 * Reference to a constructor from this scope.
 */
export const _constructor = console.__proto__.constructor.constructor;

/**
 * A function that `eval`uates the provided code in this scope.
 */
export const doEval = (code) => eval(code);
