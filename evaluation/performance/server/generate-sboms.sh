#!/bin/sh

generate() {
	testcase="$1"

	echo "generating SBOM for $testcase..."
	cd "$testcase" || exit 1
	npm clean-install 1>/dev/null 2>/dev/null
	npm run generate-sbom 1>/dev/null 2>/dev/null
	jq 'del(.serialNumber, .metadata.timestamp)' ./sbom.json >"./sbom'.json"
	mv "sbom'.json" sbom.json
	rm -rf node_modules
	cd ..
}

echo "== UPDATING SBOMs =="
cases=$(ls -d ./*/)
for dir in $cases; do
	dir=${dir#./}
	dir=${dir%/}

	generate "$dir"
done
