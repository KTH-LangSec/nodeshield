#!/bin/sh

test() {
	testcase="$1"

	printf 'testing %s...' "$testcase"

	docker run -dit \
		--rm \
		--workdir "/home/vulnerability" \
		--mount "type=bind,source=$(pwd),target=/home/vulnerability" \
		--env 'DANGEROUS_RUN_VULN=1' \
		--name "npm-dependency-guardian-$testcase" \
		'npm-dependency-guardian-vulnerability-evaluation' \
		1>/dev/null 2>/dev/null

	# Set up the testcase
	printf '\r                                                                 \r'
	printf 'testing %s... (initializing the test case 1/2)' "$testcase"
	docker exec --workdir "/home/vulnerability/$testcase" "npm-dependency-guardian-$testcase" \
		'bash' '-c' 'source /root/.nvm/nvm.sh && npm clean-install --ignore-scripts=true' \
		1>/dev/null 2>/dev/null
	printf '\r                                                                 \r'
	printf 'testing %s... (initializing the test case 2/2)' "$testcase"
	docker exec "npm-dependency-guardian-$testcase" \
		'/root/.nvm/versions/node/v18.20.8/bin/node' \
		'/home/poc/npm-dependency-guardian/npm-dependency-guardian/src/main.js' \
		"/home/vulnerability/$testcase" \
		'--overwrite' '--no-backup' \
		'--custom-modules' \
		1>/dev/null 2>/dev/null

	# Run the test case
	printf '\r                                                                 \r'
	printf 'testing %s... (executing the test case)' "$testcase"
	docker exec --workdir "/home/vulnerability/$testcase" "npm-dependency-guardian-$testcase" \
		'/home/poc/npm-dependency-guardian/nodejs-patch/node/out/Release/node' \
		'./index.js' \
		1>/dev/null 2>/dev/null
	result=$?

	# Clean up
	docker exec --workdir "/home/vulnerability/$testcase" "npm-dependency-guardian-$testcase" \
		'rm' '-rf' './node_modules' \
		1>/dev/null 2>/dev/null
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

if [ -n "$NODE_SHIELD_CONTAINER" ]; then
	echo '== TESTING (Npm Dependency Guardian) =='
	echo 'cannot run this evaluation inside the NodeShield container.'
	echo 'please run it from the NodeShield repository instead.'
	exit 0
else
	printf 'Building Npm Dependency Guardian image for testing...'
	docker run -dit --rm \
		--name 'npm-dependency-guardian-build' \
		'ghcr.io/kth-langsec/npm-dependency-guardian' \
		1>/dev/null 2>/dev/null

	printf '\r                                                                   '
	printf '\rInstalling Node.js in container 1/4'
	docker exec npm-dependency-guardian-build \
		'apt' 'install' '-y' 'curl' \
		1>/dev/null 2>/dev/null
	printf '\rInstalling Node.js in container 2/4'
	docker exec npm-dependency-guardian-build \
		'curl' '-o' '/tmp/install-node.sh' 'https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh' \
		1>/dev/null 2>/dev/null
	printf '\rInstalling Node.js in container 3/4'
	docker exec npm-dependency-guardian-build \
		'bash' '/tmp/install-node.sh' \
		1>/dev/null 2>/dev/null
	printf '\rInstalling Node.js in container 4/4'
	docker exec npm-dependency-guardian-build \
		'bash' '-c' 'source /root/.nvm/nvm.sh && nvm install 18.20.8' \
		1>/dev/null 2>/dev/null

	printf '\r                                                                   '
	printf '\rInitializing the Npm Dependency Guardian tool...'
	docker exec --workdir '/home/poc/npm-dependency-guardian/npm-dependency-guardian' npm-dependency-guardian-build \
		'bash' '-c' 'source /root/.nvm/nvm.sh && npm clean-install' \
		1>/dev/null 2>/dev/null

	printf '\r                                                                   '
	printf '\rStoring the prepared Npm Dependency Guardian image...'
	docker commit npm-dependency-guardian-build npm-dependency-guardian-vulnerability-evaluation 1>/dev/null 2>/dev/null
	docker stop npm-dependency-guardian-build  1>/dev/null 2>/dev/null &

	printf '\r                                                                 \r'
	echo '== TESTING (Npm Dependency Guardian) =='
	cases=$(ls -d ./*/)
	for dir in $cases; do
		dir=${dir#./}
		dir=${dir%/}

		test "$dir"
	done

	docker rmi --force npm-dependency-guardian-vulnerability-evaluation
fi
