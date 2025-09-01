#!/bin/sh

test() {
	testcase="$1"

	printf 'testing %s...' "$testcase"

	if [ -n "$NODE_SHIELD_CONTAINER" ]; then
		./test-one.sh "$testcase" 1>/dev/null 2>/dev/null
	else
		docker run -it --rm \
			'nodeshield-vulnerabilities' \
			-- \
			'./test-one.sh' "$testcase" \
			1>/dev/null 2>/dev/null
	fi
	result=$?

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

echo "== BUILDING =="
./.build.sh

echo
echo '== TESTING (NodeShield) =='
cases=$(ls -d ./*/)
for dir in $cases; do
	dir=${dir#./}
	dir=${dir%/}

	test "$dir"
done
