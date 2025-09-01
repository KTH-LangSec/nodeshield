import * as random from "./random.js";

/**
 * @callback RandomName
 * @param {string|Symbol} id
 */

/**
 * @typedef NameGenerator
 * @property {RandomName} for
 */

/**
 * @param {RandomName} generator
 * @returns {NameGenerator}
 */
export function create(generator) {
	const names = new Map();
	return {
		for(id) {
			if (id === undefined) {
				throw new Error("Must give an id");
			}

			if (!names.has(id)) {
				const name =
					typeof id === "string"
						? id
						: typeof id === "symbol"
							? id.description
							: null;

				names.set(id, generator(name));
			}

			return names.get(id);
		},
	};
}

/**
 * @type {Object<"random", RandomName>}
 */
export const generators = Object.freeze({
	random: (id) => `${id}$${random.hex()}`,
});
