import { createMembrane } from "./membrane.js";

export function generateFetchGlobal({ id, name, permissions, strategy }) {
	return createMembrane({
		id,
		name,
		strategy,
		isAllowed: permissions.network,
		what: "fetch",
		stub: "function fetch(){}",
	});
}
