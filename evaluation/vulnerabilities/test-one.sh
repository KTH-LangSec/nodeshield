#!/bin/sh

set -e

testcase="$1"
enable_codegen="$2"

if [ -z "$testcase" ]; then
	echo 'usage: ./test-one.sh <testcase> [1 (enables codegen)]'
	exit 2
fi

./.build.sh

# ---------------------------------------------------------------------------- #

extra_args=''
if [ -n "$enable_codegen" ]; then
	extra_args="$extra_args --enable-code-generation-from-strings"
fi

cd "$testcase"
npm clean-install --ignore-scripts=true

if [ "$testcase" = 'mobile-icon-resizer' ]; then
	violation="using 'fs' is not allowed in ./node_modules/mobile-icon-resizer/lib/resize.js"

	log=$(node ../.cli/src/cli.js \
		--strategy 'log' \
		--sbom './sbom.json' \
		--cbom './cbom.json' \
		$extra_args \
		-- \
		'./index.js' \
	)
	echo "$log"

	if [ "${log#*$violation}" != "$log" ]; then
		exit 82
	else
		exit 0
	fi
fi

node ../.cli/src/cli.js \
	--strategy 'exit' \
	--sbom './sbom.json' \
	--cbom './cbom.json' \
	$extra_args \
	-- \
	'./index.js'
