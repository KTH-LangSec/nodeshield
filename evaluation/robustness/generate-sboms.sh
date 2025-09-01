#!/bin/sh

generate() {
	testcase="$1"

	echo "generating SBOM for $testcase..."
	cd "$testcase" || exit 1
	npm sbom --sbom-format cyclonedx >./sbom.json
	jq 'del(.serialNumber, .metadata.timestamp)' ./sbom.json >"./sbom'.json"
	mv "sbom'.json" sbom.json
	cd ..
}

echo "== UPDATING SBOMs =="
cases=$(ls -d ./*/)
for dir in $cases; do
	dir=${dir#./}
	dir=${dir%/}

	generate "$dir"
done
