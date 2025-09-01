#!/bin/sh

set -e

samples=10
project="$1"
mode="$2"

valid_input='yes'
if [ -z "$project" ] || [ -z "$mode" ]; then
	valid_input='no'
fi
if [ ! "$mode" = 'cli' ] && [ ! "$mode" = 'compare' ] && [ ! "$mode" = 'coverage' ] && [ ! "$mode" = 'fpr' ]; then
	valid_input='no'
fi

if [ "$valid_input" = 'no' ]; then
	echo 'usage: ./test-one.sh <project> <what to test>'
	echo ''
	echo '  "project" must be a subdirectory of this directory'
	echo '  "what to test" must be one of "cli", "compare", "coverage", "fpr"'
	exit 1
fi

# ---------------------------------------------------------------------------- #

echo "PROJECT:      $project"
echo "MODE:         $mode"
if [ "$mode" = 'cli' ] || [ "$mode" = 'compare' ]; then
	echo "SAMPLE SIZE:  $samples"
fi
echo

# ---------------------------------------------------------------------------- #

cd "./$project"
echo '=== SETTING UP ==='
rm -rf './output.csv' './output.dsv' './output.html' './output.js'

cd "./$project"

cleanup() {
	git reset --hard
	git clean -df

	rm -rf node_modules/
	rm -f ../sbom.json ../cbom.json
	mv ../sbom.bkp ../sbom.json
	mv ../cbom.bkp ../cbom.json
}

git reset --hard
git clean -df
trap cleanup EXIT INT TERM

if [ ! -f './package-lock.json' ]; then
	# Copy in a lockfile with a snapshot of dependency versions at the time of
	# creation for reproducibility.
	cp '../package-lock.json' '.'
fi

# ---------------------------------------------------------------------------- #

npm clean-install --ignore-scripts
if [ "$project" = 'json2csv' ]; then
	# for some reason SBOM generation doesn't work without this...
	npm install --ignore-scripts
	npm install --ignore-scripts
fi

if [ "$project" = 'd3-dsv' ]; then
	# Project needs to be build before we can run it. This command builds it.
	npm run pretest
fi

if [ "$mode" = 'coverage' ]; then
	npm clean-install --ignore-scripts --omit dev

	if [ "$project" = 'mocha' ]; then
		npm uninstall --ignore-scripts --omit dev unexpected
		npm install --ignore-scripts --omit dev unexpected@10.37.7
	elif [ "$project" = 'yaml-front-matter' ]; then
		npm uninstall --ignore-scripts --omit dev commander
		npm install --ignore-scripts --omit dev commander@1.0.0
	fi
fi

# ---------------------------------------------------------------------------- #

if [ -f '../compat.patch' ]; then
	# Apply a patch for compatibility with the tool if necessary
	git apply '../compat.patch'
fi

if [ "$mode" = 'compare' ]; then
	# Apply a patch for comparative evaluation
	git apply ../ferreiraetal.patch
fi

if [ "$mode" != 'coverage' ]; then
	mv ../sbom.json ../sbom.bkp
	mv ../cbom.json ../cbom.bkp

	npm sbom \
		--sbom-format cyclonedx \
		>../sbom.json

	stdout=$(node ../../../../../src/cli.js \
		--strategy 'log' \
		--sbom '../sbom.json' \
		--build-only --cbom-output '../cbom.json' \
		--debug \
		-- \
		$(cat ../entrypoint) \
	)

	tool_cmd=$(echo "$stdout" | tail -n 1 | awk -F'`' '{print $2}')
fi

# ---------------------------------------------------------------------------- #

stdin='/dev/null'
if [ -f ./stdin ]; then
	stdin=$(cat ./stdin)
fi

# ---------------------------------------------------------------------------- #

if [ "$mode" = 'coverage' ]; then
	echo '=== COMPUTING ==='
	out=$(nyc --all --source-map=false --exclude-node-modules=false node $(cat ../entrypoint) <"$stdin")

	if [ "$project" = 'mocha' ]; then
		echo "$out" \
			| grep -E 'Statements|Branches|Functions|Lines' \
			| awk '{print $3}' \
			| paste -sd' ' - \
			| awk '{print "All files |    "$1" |     "$2" |    "$3" |    "$4" |"}' \
			| sed 's/%//g'
	else
		echo "$out"
	fi
elif [ "$mode" = 'fpr' ]; then
	echo '=== COMPUTING ==='
	echo '#FP...'
	$tool_cmd <"$stdin" 1>"../stdout.log" 2>/dev/null
	FP=$(cat ../stdout.log | sort | uniq | grep '\[V\]' | wc -l)
	rm ../stdout.log

	echo '#TN...'
	cat ../cbom.json | jq 'map_values([])' >../cbom2.json
	rm ../cbom.json
	mv ../cbom2.json ../cbom.json

	stdout=$(node ../../../../../src/cli.js \
		--strategy 'log' \
		--sbom '../sbom.json' \
		--build-only --cbom '../cbom.json' \
		--debug \
		-- \
		$(cat ../entrypoint) \
	)
	tool_cmd=$(echo "$stdout" | tail -n 1 | awk -F'`' '{print $2}')

	$tool_cmd <"$stdin" 1>"../stdout.log" 2>/dev/null
	TOTAL=$(cat ../stdout.log | sort | uniq | grep '\[V\]' | wc -l)
	TN=$((TOTAL - FP)) # What is allowed (TN) is everything disallowed when nothing is allowed minus the #FP
	rm ../stdout.log

	# -------------------------------------------------------------------------- #

	echo
	echo '=== RESULT ==='
	echo "#FP: $((FP))"
	echo "#TN: $((TN))"
	echo "FPR: $(awk -v fp="$FP" -v tn="$TN" 'BEGIN { print fp / (fp + tn) }')"
else
	echo '=== TESTING, NODE.JS ==='
	baseline=0
	for i in $(seq 1 $samples); do
		echo "  running test $i"
		start=$(date +%s%N)
		node $(cat ../entrypoint) \
			<"$stdin" \
			1>/dev/null 2>/dev/null
		end=$(date +%s%N)
		elapsed=$((end - start))
		baseline=$((baseline + elapsed))
	done

	echo
	echo '=== TESTING, TOOL ==='
	overhead=0
	for i in $(seq 1 $samples); do
		echo "  running test $i"
		start=$(date +%s%N)
		$tool_cmd \
			<"$stdin" \
			1>/dev/null 2>/dev/null
		end=$(date +%s%N)
		elapsed=$((end - start))
		overhead=$((overhead + elapsed))
	done

	# ---------------------------------------------------------------------------- #

	echo
	echo '=== RESULT ==='
	echo "Baseline  (measurements=$samples, cumulative=$(printf "%d" "$baseline")ns):  $(printf "%d" "$((baseline / samples))")ns (average)"
	echo "Benchmark (measurements=$samples, cumulative=$(printf "%d" "$overhead")ns):  $(printf "%d" "$((overhead / samples))")ns (average)"
fi
