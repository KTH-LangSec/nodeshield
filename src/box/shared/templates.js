/**
 * Replace string `from` by string `to` in string `str` without using any
 * replacement patterns.
 *
 * @param {string} str
 * @param {string} from
 * @param {string} to
 * @returns {string}
 */
function replaceVerbatim(str, from, to) {
	return str.replaceAll(from, `${to}`.replace(/\$/g, "$$$$"));
}

/**
 * @param {string} str
 * @param {[string, string][]} mapping
 * @returns {string}
 */
export function replaceAllVerbatim(str, mapping) {
	for (const [from, to] of mapping) {
		str = replaceVerbatim(str, from, to);
	}

	return str;
}
