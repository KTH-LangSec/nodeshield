# NodeShield Case Study

## Usage

- `test.sh` run the case study.
- `container.sh` start an interactive container to manually run the case study.
- `build-cbom.sh` recompute the CBOMs for the case study.
- `build-sbom.sh` regenerate the SBOMs for the case study.
  - the generated `sbom-b.json` file is expected to miss the `flatmap-stream@0.1.1` dependency.

## Duration

Running the case study is expected to take around 5 minutes.

## Prerequisites

In order for this case study to run you need the source code for
`event-stream@3.3.6` and `flatmap-stream@0.1.1`. These are expected as tar
archives in this directory.

If you are using the NodeShield container. Navigate to the directory on your
system that has all tarballs and run:

```shell
docker cp ./event-stream-3.3.6.tgz nodeshield:/home/nodeshield/evaluation/case-study
docker cp ./flatmap-stream-0.1.1.tgz nodeshield:/home/nodeshield/evaluation/case-study
```

## Notes

The malware in `flatmap-stream` only triggers when the environment variable
`npm_package_description` is set to `"A Secure Bitcoin Wallet"` (the description
of the Copay npm package at the time of the attack). This is done automatically
in the container and the `./test.sh` script.
