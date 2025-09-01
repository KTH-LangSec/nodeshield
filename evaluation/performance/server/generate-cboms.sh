#!/bin/sh

generate() {
	testcase="$1"

	echo "generating CBOM for $testcase..."
	cd "$testcase" || exit 1
	./_setup.sh
	npm clean-install 1>/dev/null 2>/dev/null
	npm run generate-cbom 1>/dev/null 2>/dev/null
	rm -rf node_modules
	cd ..
}

echo "== UPDATING CBOMs =="
cases=$(ls -d ./*/)
for dir in $cases; do
	dir=${dir#./}
	dir=${dir%/}

	generate "$dir"
done
