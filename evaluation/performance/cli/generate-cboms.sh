#!/bin/sh

generate() {
	testcase="$1"

	echo "generating CBOM for $testcase..."
	cd "$testcase/$testcase" || exit 1

	if [ ! -f './package-lock.json' ]; then
		cp '../package-lock.json' '.'
	fi

	npm clean-install --ignore-scripts 1>/dev/null 2>/dev/null
	if [ "$testcase" = 'd3-dsv' ]; then
		# Project needs to be build before we can run it. This command builds it.
		npm run pretest 1>/dev/null 2>/dev/null
	fi

	node ../../../../../src/cli.js \
		--strategy 'log' \
		--sbom '../sbom.json' \
		--build-only --cbom-output '../cbom.json' \
		--debug \
		-- \
		'not-applicable.js' \
		1>/dev/null 2>/dev/null

	git reset --hard 1>/dev/null 2>/dev/null
	git clean -df 1>/dev/null 2>/dev/null
	cd ../..
}

echo "== UPDATING CBOMs =="
cases=$(ls -d ./*/)
for dir in $cases; do
	dir=${dir#./}
	dir=${dir%/}

	generate "$dir"
done
