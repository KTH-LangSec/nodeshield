#!/bin/sh

generate() {
	testcase="$1"

	echo "generating CBOM for $testcase..."

	if [ -n "$NODE_SHIELD_CONTAINER" ]; then
		./generate-cbom.sh "$testcase" 1>/dev/null 2>/dev/null
	else
		docker run -it --rm \
			--mount "type=bind,source=$(pwd)/$testcase,target=/home/vulnerabilities/$testcase" \
			'nodeshield-vulnerabilities' \
			-- \
			'./generate-cbom.sh' "$testcase" \
			1>/dev/null 2>/dev/null
	fi
}

echo "== BUILDING =="
./.build.sh

echo
echo "== UPDATING =="
cases=$(ls -d ./*/)
for dir in $cases; do
	dir=${dir#./}
	dir=${dir%/}

	generate "$dir"
done
