#!/bin/sh

mode="$1"
if [ "$mode" != 'coverage' ] &&  [ "$mode" != 'fpr' ] && [ "$mode" != 'memory' ] && [ "$mode" != 'overhead' ] && [ "$mode" != 'throughput' ]; then
	echo 'usage: ./test.sh <what to test>'
	echo ''
	echo '  "what to test" must be one of "coverage", "fpr", "memory", "overhead", "throughput"'
	exit 1
fi

if [ -z "$NODE_SHIELD_CONTAINER" ] && [ "$mode" = 'memory' ]; then
	echo 'Evaluating memory usage outside the container is not supported'
	exit 0
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
	elif [ "$mode" = 'overhead' ]; then
		echo "$stdout" | grep -E 'Baseline|Benchmark'
	elif [ "$mode" = 'memory' ]; then
		echo "$stdout" | grep 'Maximum resident set size'
	elif [ "$mode" = 'fpr' ]; then
		echo "$stdout" | grep -E '#FP:|#TN:|FPR:'
	else
		echo "$stdout" | grep 'Result:'
	fi
	echo
done
