#!/bin/sh

generate() {
	testcase="$1"

	echo "generating CBOM for $testcase..."
	cd "$testcase/" || exit 1

	node ../../../src/cli.js \
		--strategy 'log' \
		--sbom './sbom.json' \
		--build-only --cbom-output './cbom.json' \
		--debug \
		-- \
		'not-applicable.js' \
		1>/dev/null 2>/dev/null

	jq --arg KEY 'app@0.0.0' --argjson VALUES '["code", "system"]' '
		with_entries(
			if .key == $KEY then
				.value |= reduce $VALUES[] as $v (
					.;
					if index($v) then . else . + [$v] end
				)
			else
				.
			end
		)
	' cbom.json >"cbom'.json"
	rm cbom.json
	mv "cbom'.json" cbom.json

	cd ../
}

echo "== UPDATING CBOMs =="
cases=$(ls -d ./*/)
for dir in $cases; do
	dir=${dir#./}
	dir=${dir%/}

	generate "$dir"
done
