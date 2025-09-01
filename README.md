# NodeShield: Runtime Enforcement of Security-Enhanced SBOMs for Node.js

The software supply chain is an increasingly common attack vector for malicious actors. The Node.js ecosystem has been subject to a wide array of attacks, likely due to its size and prevalence. To counter such attacks, the research community and practitioners have proposed a range of static and dynamic mechanisms, including process- and language-level sandboxing, permission systems, and taint tracking. Drawing on valuable insight from these works, this paper studies a runtime protection mechanism for (the supply chain of) Node.js applications with the ambitious goals of compatibility, automation, minimal overhead, and policy conciseness.

Specifically, we design, implement and evaluate NodeShield, a protection mechanism for Node.js that enforces an application's dependency hierarchy and controls access to system resources at runtime. We leverage the up-and-coming SBOM standard as the source of truth for the dependency hierarchy of the application, thus preventing components from stealthily abusing undeclared components. We propose to enhance the SBOM with a notion of capabilities that represents a set of related system resources a component may access. Our proposed SBOM extension, the Capability Bill of Materials or CBOM, records the required capabilities of each component, providing valuable insight into the potential privileged behavior. NodeShield enforces the SBOM and CBOM at runtime via code outlining (as opposed to inlining) with no modifications to the original code or Node.js runtime, thus preventing unexpected, potentially malicious behavior. Our evaluation shows that NodeShield can prevent over 98% out of 67 known supply chain attacks while incurring minimal overhead on servers at less than 1ms per request. We achieve this while maintaining broad compatibility with vanilla Node.js and a concise policy language that consists of at most 7 entries per dependency.

## Citation

If you use the paper, tool, and/or experiment results for academic research we encourage you to cite it as:

```bibtex
@inproceedings{NodeShield25,
  title={NodeShield: Runtime Enforcement of Security-Enhanced SBOMs for Node.js},
  author={Cornelissen, Eric and Balliu, Musard},
  booktitle={Proceedings of the 2025 ACM SIGSAC Conference on Computer and Communications Security},
  year={2025}
}
```

## Artifact

This artifact implements a runtime enforcement mechanism of Software Bill Of Materials (SBOMs) and a security extension called Capabilities Bill Of Materials (CBOM).
The source code of the artifact can be found in the `src/` directory with a test suite available under `test/`. The material for the evaluation of the artifact can be found in the `evaluation/` directory.
A `Makefile` is provided with target to run the evaluation, tests, and clean up.

## Requirements

### Hardware

The experiments reported in the paper were conducted on a desktop machine with an AMD Ryzen 7 3700x 8-core CPU (3.60GHz), 32 GB RAM, and 50 GB of disk space.
No specific hardware features are required.

### Software

We originally ran the experiments on Ubuntu 24.04, using [Node.js] v20.15.1 and [Docker] as the OCI runtime.

[docker]: https://www.docker.com/
[node.js]: https://nodejs.org/en

### Data (malicious package samples)

Part of the evaluation of NodeShield is performed on known malicious packages.
These packages come from related works (MalOSS and Backstabber’s knife collection) which do not allow us to share them.
These are only made available upon request from the NodeShield authors at [10.5281/zenodo.16900706].

If you have been given access, download the samples (use "Download all").
To follow along with the rest of this README, unpack the samples into a directory named `nodeshield-samples`.

## Setup

We provide two modes for running the NodeShield evaluation experiments:

1. A container image with a prepared environment.
2. Instructions on how to set up an environment from scratch.

For the evaluation of related work we only support a container image.

### NodeShield Container

You can obtain and run a prebuilt image from a registry using:

```shell
docker pull ghcr.io/kth-langsec/nodeshield:latest
docker run -dit --name nodeshield ghcr.io/kth-langsec/nodeshield:latest
docker exec -it nodeshield /bin/bash
```

or download the prebuilt image from Zenodo ([10.5281/zenodo.16873448]), `nodeshield-container.tar`, and load it using:

```shell
docker image load --input=nodeshield-container.tar
docker run -dit --name nodeshield ghcr.io/kth-langsec/nodeshield:latest
docker exec -it nodeshield /bin/bash
```

or build it locally, and then run it (ephemerally) using:

```shell
git clone https://github.com/kth-langsec/nodeshield.git
cd nodeshield/
make container
```

#### Initialize the Container

For the evaluation of research question 1 you need to initialize the container with the malicious code samples. You can copy them into the container as:

```shell
cd nodeshield-samples/
docker cp . nodeshield:/home/nodeshield/evaluation/malware/.tarballs
docker cp event-stream-3.3.6.tgz nodeshield:/home/nodeshield/evaluation/case-study
docker cp flatmap-stream-0.1.1.tgz nodeshield:/home/nodeshield/evaluation/case-study
```

### NodeShield from Scratch

First make sure you have git, Docker, and Node.js (v20.15.1) installed.

You can obtain the source code from GitHub, clone the repository and fetch its submodules using:

```shell
git clone https://github.com/kth-langsec/nodeshield.git
cd nodeshield/
git submodule update --init
```

or download the source code from Zenodo ([10.5281/zenodo.16873448]), `nodeshield-source.zip`.

#### Initialize the Repository

For the evaluation of research question 1 you need to copy the malicious code samples into the repository. From the root of the repository run the following after you change the value of `NODESHIELD_SAMPLES`:

```shell
NODESHIELD_SAMPLES='/path/to/nodeshield-samples'
cp -r "$NODESHIELD_SAMPLES/." ./evaluation/malware/.tarballs
cp "$NODESHIELD_SAMPLES/event-stream-3.3.6.tgz" ./evaluation/case-study
cp "$NODESHIELD_SAMPLES/flatmap-stream-0.1.1.tgz" ./evaluation/case-study
```

### Related Work

You can obtain the prebuilt image from a registry using:

```shell
docker pull ghcr.io/kth-langsec/npm-dependency-guardian:latest
```

or download the prebuilt image from Zenodo ([10.5281/zenodo.16873448]), `npm-dependency-guardian-container.tar`, and load it using:

```shell
docker image load --input=npm-dependency-guardian-container.tar
```

## Basic Test

As a basic test you can run the NodeShield test suite:

```shell
make test
```

All tests are expected to pass in about 1 minute.

## Usage

To get started with using NodeShield you can use the Node.js-based CLI
(make sure you run `npm clean-install` first):

```shell
node ./src/cli.js --help
```

To run a Node.js program using NodeShield navigate to the program directory and run it through the NodeShield CLI instead of directly with Node.js.
This requires you have an CycloneDX SBOM for the project, which you can generate using, e.g., `npm sbom`.
For example:

```shell
cd test/example
npm clean-install
node ../../src/cli.js ./index.js
```

## Experiments

To run the experiments presented in the paper we provide a set of `make`-based commands.
Targets with less specific names subsume those with more specific names.
The `evaluation` target runs all but the maintenance evaluation.

You can compare the results directly by replacing your result with the results in the relevant `SNAPSHOT` files located in the evaluation subdirectories.
(The results reported in the paper come directly from these snapshots.)
You can use `git diff` to compare the reported results against your results.
(Note that the ordering of results may be off, this is because systems differ when listing directory entries.)
Note that some results are not perfectly reproducible (e.g. performance), see the evaluation specific `README.md` for such caveats.

| Command                                       | Research Question; Table   | Duration |
| --------------------------------------------- | -------------------------- | -------: |
| `make evaluation`                             | RQ1, 2, 3, 5; Table 2-9    |   95 min |
| `make evaluate-malware`                       | RQ1; Table 2-4             |   15 min |
| `make evaluate-malware-ns`                    | RQ1; Table 2-4, column 2-3 |   10 min |
| `make evaluate-malware-ndg`                   | RQ1; Table 2-4, column 4   |    3 min |
| `make evaluate-vulnerabilities`               | RQ2; Table 5               |    3 min |
| `make evaluate-vulnerabilities-ns`            | RQ2; Table 5, column 3     |    2 min |
| `make evaluate-vulnerabilities-ndg`           | RQ2; Table 5, column 4     |    1 min |
| `make evaluate-robustness`                    | RQ3; Table 6               |    2 min |
| `make evaluate-robustness-ns`                 | RQ3; Table 6, column 2     |    1 min |
| `make evaluate-robustness-ndg`                | RQ3; Table 6, column 3     |    1 min |
| `make evaluate-maintenance`                   | RQ4; Table 7               |   60 min |
| `make evaluate-performance`                   | RQ5; Table 8, 9            |   75 min |
| `make evaluate-performance-server`            | RQ5; Table 8               |   20 min |
| `make evaluate-performance-server-overhead`   | RQ5; Table 8, column 2     |   10 min |
| `make evaluate-performance-server-throughput` | RQ5; Table 8, column 3     |   10 min |
| `make evaluate-performance-server-memory`     | RQ5; Table 8, column 4     |    1 min |
| `make evaluate-performance-cli`               | RQ5; Table 9               |   55 min |
| `make evaluate-performance-cli-overhead`      | RQ5; Table 9, column 2     |   15 min |
| `make evaluate-performance-cli-compare`       | RQ5; Table 9, column 3     |   45 min |
| `make evaluate-false-positive-rate`           | RQ5                        |   10 min |

## Case Study

To reproduce the case study we implement a demo that runs the case study.
This demo can be run using the command:

```sh
make case-study
```

which is expected to take 5 minutes and, using NodeShield, first runs `npm-run-all` with a benign version of `event-stream` and then runs `npm-run-all` with a compromised version of `event-stream`/`flatmap-stream`.

When using the benign version of `event-stream` the output is expected to end with:

```log
[...]

✖ 9 problems (8 errors, 1 warning)

ERROR: "lint" exited with 1.
```

When using the compromised version of `event-stream`/`flatmap-stream` the output is expected to be:

```log
[V] using 'crypto' is not allowed in ./node_modules/flatmap-stream/index.min.js
```

[10.5281/zenodo.16873448]: https://zenodo.org/records/16873448
[10.5281/zenodo.16900706]: https://zenodo.org/records/16900706
