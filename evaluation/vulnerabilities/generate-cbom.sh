#!/bin/sh

set -e

testcase="$1"

if [ -z "$testcase" ]; then
	echo 'usage: ./generate-cbom.sh <testcase>'
	exit 2
fi

./.build.sh

# ---------------------------------------------------------------------------- #

cd "$testcase"
npm clean-install --ignore-scripts
node ../.cli/src/cli.js \
	--strategy 'exit' \
	--sbom './sbom.json' \
	--build-only --cbom-output 'cbom.json' \
	-- \
	'./index.js'

jq --arg PREFIX "$testcase" --argjson VALUES '["code", "system"]' '
  with_entries(
    if (.key | startswith($PREFIX)) then
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

rm -rf node_modules/
