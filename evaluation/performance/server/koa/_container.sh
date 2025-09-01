#!/bin/sh

set -e

./_setup.sh

if [ -n "$NODE_SHIELD_CONTAINER" ]; then
	npm clean-install
	./_build.sh
else
	docker build \
		--file 'Containerfile' \
		--tag 'nodeshield-performance-koa' \
		.
fi
