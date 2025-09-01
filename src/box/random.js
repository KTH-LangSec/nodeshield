import * as crypto from "node:crypto";

/**
 * The security parameters, or number of bytes of security.
 *
 * @type {number}
 */
const SECURITY_PARAMETER = 2;

/**
 * The identifier for hexadecimal encoding a string.
 *
 * @type {string}
 */
const ENCODING_HEX = "hex";

/**
 * Generate random bytes encoded as hex.
 *
 * @returns {string} a hexadecimal string.
 */
export function hex() {
	return crypto.randomBytes(SECURITY_PARAMETER).toString(ENCODING_HEX);
}
