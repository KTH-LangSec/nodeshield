# NodeShield CLI-based Performance Evaluation

Benchmark from:

> Ferreira, Gabriel, et al. "Containing malicious package updates in npm with a
> lightweight permission system." 2021 IEEE/ACM 43rd International Conference on
> Software Engineering (ICSE). IEEE, 2021.

## Usage

- `test.sh` run the evaluation. See `SNAPSHOT` for the expected output.
- `test-one.sh` run the evaluation on one of the cases.
- `generate-cboms.sh` recompute the CBOM for each project.
- `generate-sboms.sh` regenerate the SBOM for each project.

## Duration

The base evaluation is expected to take around 15 minutes. The comparative
evaluation is expected to take around 40 minutes.

## Notes on the Benchmark

Two applications mentioned by Ferreira et al. are omitted here:

- `jscs` is present in the artifact but not mentioned in the paper.
- `node` is mentioned in the paper but not present in the artifact.
