#!/bin/sh

set -e

if [ -n "$NODE_SHIELD_CONTAINER" ]; then
	cp ./package-lock.json npm-run-all/package-lock.json
	cd npm-run-all/
	npm clean-install
	npm sbom --sbom-format cyclonedx >../sbom.json
	git reset --hard 1>/dev/null 2>/dev/null
	git clean -df 1>/dev/null 2>/dev/null
	cd ..
else
	rm -rf ./.cli
	mkdir ./.cli
	cp -r ../../package*.json	./.cli/
	cp -r ../../src	./.cli/src

	container_name='nodeshield-case_study'

	# build and start the container
	cp .containerignore .dockerignore
	docker build --file Containerfile --tag "$container_name" .
	docker run -dit --rm --name "$container_name" "$container_name"

	# generate the SBOM
	docker exec "$container_name" 'sh' '-c' "cd npm-run-all/ && npm sbom --sbom-format cyclonedx >../sbom.json"

	# extract the SBOM
	docker cp "$container_name":/home/case-study/sbom.json ./sbom.json

	# cleanup
	docker stop "$container_name"
fi

jq 'del(.serialNumber, .metadata.timestamp)' ./sbom.json >"./sbom'.json"
mv "sbom'.json" sbom.json
mv sbom.json sbom-a.json
sed "s/3\.3\.4/3\.3\.6/g" sbom-a.json >sbom-b.json
