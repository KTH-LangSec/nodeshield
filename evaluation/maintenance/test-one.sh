#!/bin/sh

## -- constants
max_commits_to_check=1000
patch_in_version="yes"

## -- parameters
target="$1"
here="$(pwd)"

if [ -z "$target" ]; then
	echo 'usage: ./test-one.sh <target>'
	exit 2
fi

## -- Move into target project
cd "$target" || exit 1

## -- Check if it's a git repo
if ! git status 1>/dev/null 2>/dev/null; then
	echo "$target is not a git repository"
	exit 1
fi

## -- Check if it's a npm project
if ! npm install --ignore-scripts 1>/dev/null 2>/dev/null; then
	echo "$target is not a npm project"
	exit 1
fi

## -- Initialize dir to store results
mkdir "$here/.results/" 2>/dev/null || true
result_index=$(ls -l "$here/.results/" | wc -l)
result_dir="$here/.results/$result_index"
mkdir "$result_dir"

## -- Compute CBOM for all commits
first_commit=$(git rev-parse HEAD)
current_commit="$first_commit"
i=0
while true; do
	i=$((i+1))
	echo "commit $i ($current_commit)"

	## Add a version to package.json so that SBOM generation works
	if [ "$patch_in_version" = "yes" ]; then
		manifest_with_version=$(cat package.json  | jq '. + {version: "1.0.0"}') || true
		echo "$manifest_with_version" >package.json
	fi

	## Compute the SBOM and CBOM (which requires a fresh install of dependencies)
	npm install \
		--ignore-scripts \
			1>/dev/null 2>/dev/null || true

	npm sbom \
		--sbom-format cyclonedx \
		--omit dev \
			>"$result_dir/$i-sbom.json" \
			2>/dev/null || true

	node "$here/../../src/cli.js" \
		--build-only \
		--strategy log \
		--sbom "$result_dir/$i-sbom.json" \
		--cbom-output "$result_dir/$i-cbom.json" \
		-- entrypoint_does_not_matter \
			1>/dev/null 2>/dev/null || true

	##
	git reset --hard 1>/dev/null 2>/dev/null

	## break early if we reached the maximum number of commits
	if [ "$i" -ge "$max_commits_to_check" ]; then
		git checkout "$first_commit" 1>/dev/null 2>/dev/null
		git clean -dfx 1>/dev/null 2>/dev/null
		break
	fi

	## Try to checkout the previous commit, if that fails we reset and break
	if ! git checkout HEAD~1 1>/dev/null 2>/dev/null; then
		git checkout "$first_commit" 1>/dev/null 2>/dev/null
		git clean -dfx 1>/dev/null 2>/dev/null
		break
	else
		current_commit=$(git rev-parse HEAD)
	fi
done

## -- Diff all consecutive CBOMs
cd "$here" || exit 1
node diff-cboms.js "$result_index"
