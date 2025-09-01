# NodeShield Vulnerability Evaluation

Benchmark from:

> Bhuiyan, Masudul Hasan Masud, et al. "SecBench.js: An executable security
> benchmark suite for server-side JavaScript." 2023 IEEE/ACM 45th International
> Conference on Software Engineering (ICSE). IEEE, 2023.

specifically <https://github.com/cristianstaicu/SecBench.js/tree/bc31562>.

## Usage

- `test.sh` run the evaluation with NodeShield. See `SNAPSHOT` for the expected output.
- `test-ndg.sh` run the evaluation with Npm Dependency Guardian (ndg). See `SNAPSHOT` for the expected output.
- `test-one.sh` run the evaluation on one of the cases.
- `container.sh` start an interactive container to manually run the evaluation.
- `generate-cboms.sh` recompute the CBOM for each testcase.
  - `generate-cbom.sh` recompute the CBOM of one testcase.
- `generate-sboms.sh` regenerate the SBOM for each testcase.

## Duration

This evaluation is expected to take around 5 minutes.
The evaluation for NodeShield is expected to take around 2 minutes and for Npm Dependency Guardian 1 minute.
