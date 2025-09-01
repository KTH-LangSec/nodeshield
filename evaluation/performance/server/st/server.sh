#!/bin/sh

set -e

cmd="$1"

if [ "$cmd" = 'stop' ]; then
	if [ -n "$NODE_SHIELD_CONTAINER" ]; then
		ps | grep -E "$(cat _tool_server.sh)|npm run start" | grep -v 'grep' | awk '{print $1}' | xargs kill
	else
		docker stop --signal SIGKILL 'nodeshield-performance-st'
		sleep 10
	fi
else
	if [ -n "$NODE_SHIELD_CONTAINER" ]; then
		PORT=1337 npm run "$cmd"
	else
		./_container.sh
		docker run -d --rm \
			-p '1337:1337' \
			--entrypoint 'npm' \
			--name 'nodeshield-performance-st' \
			'nodeshield-performance-st' \
			-- \
			'run' "$cmd"
	fi
fi
