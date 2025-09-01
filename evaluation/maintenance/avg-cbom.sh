#!/bin/sh

file_count=0
capability_count=0
dependency_count=0

cd ../
files=$(find . -type f -name "cbom.json")
for file in $files; do
	sum=$(jq 'map(length) | add' "$file" 2>/dev/null)
	keys=$(jq 'keys | length' "$file" 2>/dev/null)

	file_count=$((file_count + 1))
	capability_count=$((capability_count + sum))
	dependency_count=$((dependency_count + keys))
done

if [ $file_count -gt 0 ]; then
	average_capabilities=$((capability_count / file_count))
	average_dependencies=$((dependency_count / file_count))
	capability_per_dependency=$(awk -v cap="$average_capabilities" -v dep="$average_dependencies" 'BEGIN { printf "%.2f", cap / dep }')

	echo "Total # of number of CBOMs          : $file_count"
	echo "Total # of capabilities in CBOMS    : $capability_count"
	echo "Average # of dependencies per CBOM  : $average_dependencies"
	echo "Average # of capability per CBOM    : $average_capabilities"
	echo "Average # capability per dependency : $capability_per_dependency"
else
	echo 'No CBOMs found'
fi
