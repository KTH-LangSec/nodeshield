#!/bin/sh

set -e

variant="$1"
if [ "$variant" != 'benign' ] && [ "$variant" != 'malicious' ]; then
	echo 'usage: ./build-cbom.sh <benign|malicious>'
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
	node ../.cli/src/cli.js --strategy 'log' --sbom "../$sbom" --build-only --cbom-output "../$cbom" -- 'bin/run-s/index.js'
	git reset --hard 1>/dev/null 2>/dev/null
	git clean -df 1>/dev/null 2>/dev/null
else
	container_name='nodeshield-case_study'

	cleanup() {
		docker stop "$container_name"
	}

	# build and start the container
	cp .containerignore .dockerignore
	docker build --file Containerfile --tag "$container_name" .
	docker run -dit --rm --name "$container_name" "$container_name"

	# cleanup
	trap cleanup EXIT INT TERM

	if [ "$variant" = 'malicious' ]; then
		# copy in the malicious package versions
		docker cp ./event-stream-3.3.6.tgz "$container_name":/home/case-study
		docker cp ./flatmap-stream-0.1.1.tgz "$container_name":/home/case-study

		docker exec "$container_name" 'sh' '-c' "cd npm-run-all/ && tar -xzf '../$eventstream_archive' -C './node_modules'"
		docker exec "$container_name" 'sh' '-c' "cd npm-run-all/ && tar -xzf '../$flatmap_archive' -C './node_modules'"
	fi

	# generate the CBOM
	docker exec "$container_name" 'sh' '-c' "cd npm-run-all/ && node ../.cli/src/cli.js --strategy 'log' --sbom '../$sbom' --build-only --cbom-output '../$cbom' -- 'bin/run-s/index.js'"

	# extract the CBOM
	docker cp "$container_name:/home/case-study/$cbom" "./$cbom"
fi
