import { createMembrane } from "./membrane.js";

export function generateCryptoClassGlobal({ id, name, permissions, strategy }) {
	return createMembrane({
		id,
		name,
		strategy,
		isAllowed: permissions.crypto,
		what: "Crypto",
		stub: "class Crypto{}",
	});
}

export function generateCryptoKeyGlobal({ id, name, permissions, strategy }) {
	return createMembrane({
		id,
		name,
		strategy,
		isAllowed: permissions.crypto,
		what: "CryptoKey",
		stub: "class CryptoKey{}",
	});
}

export function generateCryptoVarGlobal({ id, name, permissions, strategy }) {
	return createMembrane({
		id,
		name,
		strategy,
		isAllowed: permissions.crypto,
		what: "crypto",
		stub: "class Crypto{}",
	});
}

export function generateSubtleCryptoGlobal({
	id,
	name,
	permissions,
	strategy,
}) {
	return createMembrane({
		id,
		name,
		strategy,
		isAllowed: permissions.crypto,
		what: "SubtleCrypto",
		stub: "class SubtleCrypto{}",
	});
}
