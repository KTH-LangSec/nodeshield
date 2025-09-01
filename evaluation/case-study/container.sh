#!/bin/sh

set -e

container_name='nodeshield-case_study'

# ---------------------------------------------------------------------------- #

rm -rf ./.cli
mkdir ./.cli
cp -r ../../package*.json	./.cli/
cp -r ../../src	./.cli/src

# ---------------------------------------------------------------------------- #

cleanup() {
	docker stop "$container_name"
}

# build and start the container
cp .containerignore .dockerignore
docker build --file Containerfile --tag "$container_name" .
docker run -dit --rm --name "$container_name" "$container_name"

# cleanup
trap cleanup EXIT INT TERM

# copy in the malicious package versions
docker cp ./event-stream-3.3.6.tgz "$container_name":/home/case-study
docker cp ./flatmap-stream-0.1.1.tgz "$container_name":/home/case-study

# attack shell to the container
docker exec -it "$container_name" /bin/sh
