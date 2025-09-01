# NodeShield Robustness Evaluation

Benchmark from:

> Alhamdan, Abdullah, and Cristian-Alexandru Staicu. "SandDriller: A
> Fully-Automated Approach for Testing Language-Based JavaScript Sandboxes."
> 32nd USENIX Security Symposium (USENIX Security 23). 2023.

## Usage

- `test.sh` run the evaluation with NodeShield. See `SNAPSHOT` for the expected output.
- `test-ndg.sh` run the evaluation with Npm Dependency Guardian (ndg). See `SNAPSHOT` for the expected output.
- `container.sh` start an interactive container to manually run the evaluation.
- `generate-cboms.sh` recompute the CBOM for each testcase.
- `generate-sboms.sh` regenerate the SBOM for each testcase.

## Duration

This evaluation is expected to take around 2 minutes.
The evaluation for NodeShield is expected to take around 1 minutes and for Npm Dependency Guardian 1 minute.

## Index

| Which                            | PoC            | Comment                  |
| -------------------------------- | -------------- | ------------------------ |
| Figure 1: CVE-2021-23449         | `./driller-01` |                          |
| Figure 5                         | `./driller-02` |                          |
| Figure 6                         | `./driller-03` |                          |
| Figure 7                         | `./driller-04` |                          |
| Figure 8                         | `./driller-05` |                          |
| vm2 issue #138                   | `./driller-06` |                          |
| vm2 issue #175                   | `./driller-07` |                          |
| vm2 issue #177                   | `./driller-08` |                          |
| vm2 issue #179                   | `./driller-09` |                          |
| vm2 issue #184                   | `./driller-10` |                          |
| vm2 issue #185                   | `./driller-11` |                          |
| vm2 issue #186                   | `./driller-12` |                          |
| vm2 issue #187                   | `./driller-13` |                          |
| vm2 issue #197                   | `./driller-14` |                          |
| vm2 issue #199                   | `./driller-15` |                          |
| vm2 issue #224                   | `./driller-16` |                          |
| vm2 issue #225                   | `./driller-17` |                          |
| vm2 issue #241                   | `./driller-18` |                          |
| vm2 issue #268                   | `./driller-19` |                          |
| vm2 issue #276                   | `./driller-20` |                          |
| GHSA-7cg8-pq9v-x98q              | -              | No PoC available         |
| GHSA-6jg8-7333-554w              | -              | No PoC available         |
| safe-eval issue #5               | `./driller-21` |                          |
| safe-eval issue #7               | -              | No PoC available         |
| safe-eval issue #16              | `./driller-22` |                          |
| safe-eval issue #18              | `./driller-23` |                          |
| safe-eval issue #19              | `./driller-24` |                          |
| safe-eval issue #24, 1           | `./driller-25` |                          |
| safe-eval issue #24, 2           | `./driller-26` |                          |
| safe-eval issue #24, 3           | `./driller-21` | Duplicate of issue #5    |
| Politz et al.                    | n/a            | Does not work on Node.js |
| Michał Bentkowski’s blog post, 1 | `./driller-27` |                          |
| Michał Bentkowski’s blog post, 2 | `./driller-28` |                          |
| Michał Bentkowski’s blog post, 3 | `./driller-29` |                          |
| PortSwigger blog post            | n/a            | Does not work on Node.js |
