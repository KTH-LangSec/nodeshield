#!/bin/sh

mode="$1"

if [ ! "$mode" = 'cli' ] && [ ! "$mode" = 'compare' ] && [ ! "$mode" = 'coverage' ] && [ ! "$mode" = 'fpr' ]; then
	echo 'usage: ./test.sh <what to test>'
	echo ''
	echo '  "what to test" must be one of "cli", "compare", "coverage", "fpr"'
	exit 1
fi

echo "=== TESTING ($mode) ==="
cases=$(ls -d ./*/)
for dir in $cases; do
	dir=${dir#./}
	dir=${dir%/}

	echo "> $dir <"
	stdout=$(./test-one.sh "$dir" "$mode" 2>/dev/null)
	if [ "$mode" = 'coverage' ]; then
		echo ' % Stmts | % Branch | % Funcs | % Lines |'
		echo "$stdout" | grep 'All files' | sed 's/^[^|]*|//'
	elif [ "$mode" = 'fpr' ]; then
		echo "$stdout" | grep -E '#FP:|#TN:|FPR:'
	else
		echo "$stdout" | grep -E 'Baseline|Benchmark'
	fi
	echo
done
