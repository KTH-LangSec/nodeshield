#!/bin/sh

set -e

setup_log=$(node .cli/src/cli.js \
	--strategy 'log' \
	--sbom 'sbom.json' \
	--cbom 'cbom.json' \
	--build-only \
	-- \
	'./lib/cli/bin.js' --watch 'db.json' --port 3000 --host 0.0.0.0
)

tool_cmd=$(echo "$setup_log" | grep 'Run: ' | awk -F'`' '{print $2}')
echo $tool_cmd >./_tool_server.sh
