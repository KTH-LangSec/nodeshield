#!/bin/sh

set -e

overhead_samples=5000

# ---------------------------------------------------------------------------- #

project="$1"
mode="$2"

valid_input='yes'
if [ -z "$project" ] || [ -z "$mode" ]; then
	valid_input='no'
fi
if [ "$mode" != 'coverage' ] && [ "$mode" != 'fpr' ] && [ "$mode" != 'memory' ] && [ "$mode" != 'overhead' ] && [ "$mode" != 'throughput' ]; then
	valid_input='no'
fi

if [ "$valid_input" = 'no' ]; then
	echo 'usage: ./test-one.sh <project> <what to test>'
	echo ''
	echo '  "project" must be a subdirectory of this directory'
	echo '  "what to test" must be one of "coverage", "fpr", "memory", "overhead", "throughput"'
	exit 1
fi

if [ -z "$NODE_SHIELD_CONTAINER" ] && [ "$mode" = 'memory' ]; then
	echo 'Evaluating memory usage outside the container is not supported'
	exit 1
fi
if [ -z "$NODE_SHIELD_CONTAINER" ] && [ "$mode" = 'coverage' ]; then
	echo 'Evaluating coverage outside the container is not supported'
	exit 1
fi

echo "PROJECT:      $project"
echo "TEST:         $mode"

# ---------------------------------------------------------------------------- #

cd "./$project"

echo '=== SETTING UP ==='
rm -rf ./.results/
mkdir ./.results/
./_setup.sh 1>/dev/null 2>/dev/null

echo
echo '=== BUILDING ==='
./_container.sh 1>/dev/null 2>/dev/null

# ---------------------------------------------------------------------------- #

port=$(cat .port)
endpoint=$(cat .endpoint)

if [ "$mode" = 'coverage' ]; then
	echo '=== COMPUTING ==='

	./server.sh start-coverage 1>./stdout.log 2>/dev/null &
	sleep 20
	curl "http://localhost:$port/$endpoint" 1>/dev/null
	./server.sh stop 1>/dev/null 2>/dev/null

	sleep 1
	cat stdout.log
elif [ "$mode" = 'fpr' ]; then
	cp sbom.json sbom.bkp
	cp cbom.json cbom.bkp

	# -------------------------------------------------------------------------- #

	echo '=== COMPUTING ==='
	echo '#FP...'

	./server.sh start-tool 1>./stdout.log 2>/dev/null &
	sleep 10
	curl "http://localhost:$port/$endpoint" 1>/dev/null 2>/dev/null
	if [ -z "$NODE_SHIELD_CONTAINER" ]; then
		docker logs "nodeshield-performance-$project" 1>./stdout.log 2>/dev/null
	fi
	./server.sh stop 1>/dev/null 2>/dev/null

	FP=$(cat stdout.log | sort | uniq | grep '\[V\]' | wc -l)
	rm stdout.log

	echo '#TN...'
	cat cbom.json | jq 'map_values([])' >cbom2.json
	rm cbom.json
	mv cbom2.json cbom.json
	./_container.sh 1>/dev/null 2>/dev/null

	./server.sh start-tool 1>./stdout.log 2>/dev/null &
	sleep 10
	curl "http://localhost:$port/$endpoint" 1>/dev/null 2>/dev/null
	if [ -z "$NODE_SHIELD_CONTAINER" ]; then
		docker logs "nodeshield-performance-$project" 1>./stdout.log 2>/dev/null
	fi
	./server.sh stop 1>/dev/null 2>/dev/null

	TOTAL=$(cat stdout.log | sort | uniq | grep '\[V\]' | wc -l)
	TN=$((TOTAL - FP)) # What is allowed (TN) is everything disallowed when nothing is allowed minus the #FP
	rm stdout.log

	# -------------------------------------------------------------------------- #

	echo
	echo '=== RESULT ==='
	echo "#FP: $((FP))"
	echo "#TN: $((TN))"
	echo "FPR: $(awk -v fp="$FP" -v tn="$TN" 'BEGIN { print fp / (fp + tn) }')"

	rm sbom.json cbom.json
	mv sbom.bkp sbom.json
	mv cbom.bkp cbom.json
elif [ "$mode" = 'throughput' ]; then
	echo
	echo '=== TESTING, BASELINE ==='
	./server.sh start-vanilla 1>/dev/null 2>/dev/null &
	sleep 10
	node ../test-throughput.mjs "$port" "$endpoint"
	./server.sh stop 1>/dev/null 2>/dev/null

	echo
	echo '=== TESTING, TOOL ==='
	./server.sh start-tool 1>/dev/null 2>/dev/null &
	sleep 10
	node ../test-throughput.mjs "$port" "$endpoint"
	./server.sh stop 1>/dev/null 2>/dev/null
elif [ "$mode" = 'memory' ]; then
	time_file=time.txt
	duration=5s

	echo
	echo '=== TESTING, BASELINE ==='
	/usr/bin/time -v -o $time_file \
		timeout $duration \
		node server.js \
		1>/dev/null 2>/dev/null \
		|| true
	cat $time_file | grep 'Maximum resident set size'

	echo
	echo '=== TESTING, TOOL ==='
	/usr/bin/time -v -o $time_file \
		timeout $duration \
		$(cat _tool_server.sh) \
		1>/dev/null 2>/dev/null \
		|| true

	cat $time_file | grep 'Maximum resident set size'
elif [ "$mode" = 'overhead' ]; then
	echo
	echo '=== TESTING, BASELINE ==='
	./server.sh start-vanilla 1>/dev/null 2>/dev/null &
	sleep 10
	baseline=0
	for i in $(seq 1 $overhead_samples); do
		echo "  running test $i"
		start=$(date +%s%N)
		curl "http://localhost:$port/$endpoint" 1>/dev/null 2>/dev/null
		end=$(date +%s%N)
		elapsed=$((end - start))
		baseline=$((baseline + elapsed))
	done
	./server.sh stop 1>/dev/null 2>/dev/null

	echo
	echo '=== TESTING, TOOL ==='
	./server.sh start-tool 1>/dev/null 2>/dev/null &
	sleep 10
	overhead=0
	for i in $(seq 1 $overhead_samples); do
		echo "  running test $i"
		start=$(date +%s%N)
		curl "http://localhost:$port/$endpoint" 1>/dev/null 2>/dev/null
		end=$(date +%s%N)
		elapsed=$((end - start))
		overhead=$((overhead + elapsed))
	done
	./server.sh stop 1>/dev/null 2>/dev/null

	# -------------------------------------------------------------------------- #

	echo
	echo '=== RESULT ==='
	echo "Baseline  (measurements=$overhead_samples, cumulative=$(printf "%d" "$baseline")ns):  $(printf "%d" "$((baseline / overhead_samples))")ns (average)"
	echo "Benchmark (measurements=$overhead_samples, cumulative=$(printf "%d" "$overhead")ns):  $(printf "%d" "$((overhead / overhead_samples))")ns (average)"
fi
