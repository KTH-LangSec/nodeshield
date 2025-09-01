#!/bin/sh

set -e

rm -rf ./.cli
mkdir ./.cli
cp -r ../../../../package*.json	./.cli/
cp -r ../../../../src	./.cli/src

cp .containerignore .dockerignore
