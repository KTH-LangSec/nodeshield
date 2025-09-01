#!/bin/sh

set -e

variant="$1"
if [ "$variant" != 'benign' ] && [ "$variant" != 'malicious' ]; then
	echo 'usage: ./test.sh <benign|malicious>'
	exit 2
fi

eventstream_archive='event-stream-3.3.6.tgz'
flatmap_archive='flatmap-stream-0.1.1.tgz'
if [ ! -f "$eventstream_archive" ]; then
	echo "Missing $eventstream_archive"
	exit 2
fi
if [ ! -f "$flatmap_archive" ]; then
	echo "Missing $flatmap_archive"
	exit 2
fi

# ---------------------------------------------------------------------------- #

if [ -d '../../src' ]; then
	rm -rf ./.cli
	mkdir ./.cli
	cp -r ../../package*.json	./.cli/
	cp -r ../../src	./.cli/src
fi

# ---------------------------------------------------------------------------- #

sbom='sbom-a.json'
cbom='cbom-a.json'
if [ "$variant" = 'malicious' ]; then
	sbom='sbom-b.json'
	cbom='cbom-b.json'
fi

# ---------------------------------------------------------------------------- #

if [ -n "$NODE_SHIELD_CONTAINER" ]; then
	cp ./package-lock.json npm-run-all/package-lock.json
	cd npm-run-all/
	npm clean-install
	if [ "$variant" = 'malicious' ]; then
		tar -xzf "../$eventstream_archive" -C './node_modules'
		tar -xzf "../$flatmap_archive" -C './node_modules'
	fi

	echo
	echo "== RUNNING ($variant) =="
	npm_package_description='A Secure Bitcoin Wallet' node ../.cli/src/cli.js \
		--strategy 'exit' \
		--sbom "../$sbom" \
		--cbom "../$cbom" \
		-- \
		'bin/run-s/index.js' 'lint'
else
	container_name='nodeshield-case_study'

	cleanup() {
		docker stop "$container_name-$variant"
	}

	# build and start the container
	cp .containerignore .dockerignore
	docker build --file Containerfile --tag "$container_name" .
	docker run -dit --rm --name "$container_name-$variant" "$container_name"

	trap cleanup EXIT INT TERM

	if [ "$variant" = 'malicious' ]; then
		# copy in the malicious package versions
		docker cp ./event-stream-3.3.6.tgz "$container_name-$variant":/home/case-study
		docker cp ./flatmap-stream-0.1.1.tgz "$container_name-$variant":/home/case-study

		docker exec "$container_name-$variant" 'sh' '-c' "cd npm-run-all/ && tar -xzf '../$eventstream_archive' -C './node_modules'"
		docker exec "$container_name-$variant" 'sh' '-c' "cd npm-run-all/ && tar -xzf '../$flatmap_archive' -C './node_modules'"
	fi

	# run the test
	docker exec "$container_name-$variant" 'sh' '-c' "cd npm-run-all/ && node ../.cli/src/cli.js --strategy 'exit' --sbom '../$sbom' --cbom '../$cbom' -- 'bin/run-s/index.js' 'lint'"
fi
