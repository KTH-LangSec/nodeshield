#!/bin/sh

generate() {
	testcase="$1"

	echo "generating SBOM for $testcase..."
	cd "$testcase/$testcase" || exit 1

	if [ ! -f './package-lock.json' ]; then
		cp '../package-lock.json' '.'
	fi

	npm clean-install --ignore-scripts 1>/dev/null 2>/dev/null
	if [ "$testcase" = 'json2csv' ]; then
		# for some reason SBOM generation doesn't work without this...
		npm install --ignore-scripts 1>/dev/null 2>/dev/null
		npm install --ignore-scripts 1>/dev/null 2>/dev/null
	fi

	npm sbom --sbom-format cyclonedx >../sbom.json
	jq 'del(.serialNumber, .metadata.timestamp)' ../sbom.json >"../sbom'.json"
	mv "../sbom'.json" ../sbom.json

	git reset --hard 1>/dev/null 2>/dev/null
	git clean -df 1>/dev/null 2>/dev/null
	cd ../..
}

echo "== UPDATING SBOMs =="
cases=$(ls -d ./*/)
for dir in $cases; do
	dir=${dir#./}
	dir=${dir%/}

	generate "$dir"
done
