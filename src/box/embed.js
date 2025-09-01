export function embed(src) {
	src = removeSourceMaps(src);
	src = escapeSpecialCharacters(src);
	return src;
}

export function removeSourceMaps(src) {
	return src
		.replace(/\/\/\# sourceMappingURL=.+?\.map/, "")
		.replace(
			/\/\/\# sourceMappingURL=data:application\/json;base64,[A-z0-9+/=]+/,
			"",
		);
}

export function escapeSpecialCharacters(src) {
	return src.replace(/\\/g, "\\\\").replace(/\$/g, "\\$$").replace(/`/g, "\\`");
}
