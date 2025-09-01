#!/bin/sh

test() {
	testcase="$1"

	echo "Collecting data for '$testcase'..."
	./test-one.sh "$testcase" | grep 'Total number of '
	echo
}

rm -rf '.results/'

echo '== TESTING =='
cases=$(ls -d ./*/)
for dir in $cases; do
	dir=${dir#./}
	dir=${dir%/}

	test "$dir"
done
