FROM docker.io/node:20.15.1-alpine3.20

ENV NODE_SHIELD_CONTAINER=1 \
	INSTALL_TIME_CBOM=1 \
	# Allow for running the malware evaluation
	DANGEROUS_RUN_MALWARE=1 \
	# Allow for running the vulnerabilities evaluation
	DANGEROUS_RUN_VULN=1

RUN apk update \
 && apk upgrade \
 && apk add --no-cache \
	bash coreutils curl git jq make tar \
 && npm install --global nyc@17.1.0

WORKDIR /home/nodeshield

COPY ./ ./
RUN npm clean-install \
	--no-audit --no-fund --no-update-notifier
RUN git submodule update --init

ENTRYPOINT ["/bin/bash"]
