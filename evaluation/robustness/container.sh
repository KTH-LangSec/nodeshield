#!/bin/sh

set -e

./.build.sh
docker run -it --rm 'nodeshield-robustness'
