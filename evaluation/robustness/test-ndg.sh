#!/bin/sh

test_npm_dependency_guardian() {
	testcase="$1"

	printf 'testing %s...' "$testcase"

	docker run -dit \
		--rm \
		--workdir "/home/robustness/$testcase" \
		--mount "type=bind,source=$(pwd)/$testcase,target=/home/robustness/$testcase" \
		--env 'DANGEROUS_RUN_VULN=1' \
		--name "npm-dependency-guardian-$testcase" \
		'ghcr.io/kth-langsec/npm-dependency-guardian' \
		1>/dev/null 2>/dev/null

	docker cp './node_policy.json' "npm-dependency-guardian-$testcase:/tmp" 1>/dev/null 2>/dev/null

	docker exec "npm-dependency-guardian-$testcase" \
		/home/poc/npm-dependency-guardian/nodejs-patch/node/out/Release/node \
		./index.js \
		1>/dev/null 2>/dev/null
	result=$?

	docker stop "npm-dependency-guardian-$testcase" 1>/dev/null 2>/dev/null &

	printf '\r                                                        '
	if [ $result -eq 42 ] || [ $result -eq 82 ]; then
		printf "PREVENTED"
	elif [ $result -eq 0 ]; then
		printf "NOT PREVENTED"
	else
		printf "UNEXPECTED (got '%s')" "$result"
	fi
	printf '\r%s \n' "$testcase"
}

echo '== TESTING (Npm Dependency Guardian) =='
if [ -n "$NODE_SHIELD_CONTAINER" ]; then
	echo 'cannot run this evaluation inside the NodeShield container.'
	echo 'please run it from the NodeShield repository instead.'
	exit 0
else
	cases=$(ls -d ./*/)
	for dir in $cases; do
		dir=${dir#./}
		dir=${dir%/}

		test_npm_dependency_guardian "$dir"
	done
fi
