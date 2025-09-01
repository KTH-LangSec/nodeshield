const local = "foobar";

/**
 * The name of a local variable that exists in this scope.
 */
module.exports.localVariableName = "local";

/**
 * Reference to `eval` from this scope.
 */
module.exports._eval = eval;

/**
 * Reference to the `Function` constructor from this scope.
 */
module.exports._Function = Function;

/**
 * Reference to a constructor from this scope.
 */
module.exports._constructor = console.__proto__.constructor.constructor;

/**
 * A function that `eval`uates the provided code in this scope.
 */
module.exports.doEval = (code) => eval(code);
