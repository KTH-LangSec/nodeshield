#!/bin/sh

test_node_shield() {
	testcase="$1"

	printf 'testing %s...' "$testcase"

	if [ -n "$NODE_SHIELD_CONTAINER" ]; then
		cd "$testcase" || exit 1
		npm run test-tool 1>/dev/null 2>/dev/null
		result=$?
		cd ..
	else
		docker run \
			--rm \
			--workdir "/home/robustness/$testcase" \
			--entrypoint 'npm' \
			'nodeshield-robustness' \
			-- \
			'run' 'test-tool' \
			1>/dev/null 2>/dev/null
		result=$?
	fi

	printf '\r                                                        '
	if [ $result -eq 42 ] || [ $result -eq 82 ] || [ $result -eq 7 ]; then
		# 7='RangeError: Maximum call stack size exceeded'
		printf "PREVENTED"
	elif [ $result -eq 0 ]; then
		printf "NOT PREVENTED"
	else
		printf "UNEXPECTED (got '%s')" "$result"
	fi
	printf '\r%s \n' "$testcase"
}

echo "== BUILDING =="
./.build.sh

echo
echo '== TESTING (NodeShield) =='
cases=$(ls -d ./*/)
for dir in $cases; do
	dir=${dir#./}
	dir=${dir%/}

	test_node_shield "$dir"
done
