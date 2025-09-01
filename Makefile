.PHONY: default help
default: help

help: ## Show this help message
	@printf "Usage: make <command>\n\n"
	@printf "Commands:\n"
	@awk -F ':(.*)## ' '/^[a-zA-Z0-9%\\\/_.-]+:(.*)##/ { \
		printf "  \033[36m%-30s\033[0m %s\n", $$1, $$NF \
	}' $(MAKEFILE_LIST)

.PHONY: clean
clean: ## Clean the project
	@git clean -dfx
	@rm -rf /tmp/s2s-*

.PHONY: container image image-export
container: image ## Start an OCI container for the project
	@docker run -it \
		--rm \
		--name nodeshield \
		nodeshield

image: ## Create an OCI image for the project
	@cp .containerignore .dockerignore
	@docker build \
		--file Containerfile \
		--tag nodeshield \
		.

image-export: image ## Export an OCI image for the project
	@rm -f nodeshield-container.tar
	@docker tag nodeshield:latest ghcr.io/kth-langsec/nodeshield:latest
	@docker image save ghcr.io/kth-langsec/nodeshield \
		--output=nodeshield-container.tar

.PHONY: format-check
check-formatting: node_modules ## Check the formatting of the code base
	@npx prettier --check .

.PHONY: fmt format
fmt: format
format: node_modules ## Format the code base
	@npx prettier --write .

.PHONY: test test-assumptions test-integration test-unit
test: test-assumptions test-unit test-integration ## Run all automated tests

test-assumptions: node_modules
	@node --test test/assumptions/*.test.cjs test/assumptions/*.test.mjs

test-integration: node_modules ## Run all integration tests
	@node --test test/integration/*.test.js

test-unit: node_modules ## Run all unit tests
	@node --test test/unit/*.test.js

.PHONY: evaluation evaluate-false-positive-rate evaluate-maintenance evaluate-malware evaluate-malware-ns evaluate-malware-ndg evaluate-performance evaluate-performance-server evaluate-performance-server-memory evaluate-performance-server-overhead evaluate-performance-server-throughput evaluate-performance-cli evaluate-performance-cli-overhead evaluate-performance-cli-compare evaluate-robustness evaluate-robustness-ns evaluate-robustness-ndg evaluate-vulnerabilities evaluate-vulnerabilities-ns evaluate-vulnerabilities-ndg
evaluation: evaluate-malware evaluate-vulnerabilities evaluate-robustness evaluate-performance ## Run all evaluations (95min)

evaluate-false-positive-rate: node_modules ## Run the false positive rate evaluation (10min)
	@cd evaluation/performance/server && ./test.sh fpr
	@cd evaluation/performance/cli && ./test.sh fpr

evaluate-maintenance: node_modules ## Run the maintenance evaluation (60min)
	@cd evaluation/maintenance && ./test.sh

evaluate-malware: evaluate-malware-ns evaluate-malware-ndg ## Run the malware evaluation (15min)

evaluate-malware-ns: node_modules ## Run the malware evaluation with NodeShield (10min)
	@cd evaluation/malware && ./test.sh

evaluate-malware-ndg: ## Run the malware evaluation with ndg (3min)
	@cd evaluation/malware && ./test-ndg.sh

evaluate-performance: evaluate-performance-server evaluate-performance-cli ## Run all performance evaluations (75min)

evaluate-performance-server: evaluate-performance-server-memory evaluate-performance-server-overhead evaluate-performance-server-throughput ## Run all servers-based performance evaluations (20min)
evaluate-performance-server-memory: node_modules ## Run the memory overhead evaluation (1min)
	@cd evaluation/performance/server && ./test.sh memory
evaluate-performance-server-overhead: node_modules ## Run the server overhead evaluation (10min)
	@cd evaluation/performance/server && ./test.sh overhead
evaluate-performance-server-throughput: node_modules ## Run the server throughput evaluation (10min)
	@cd evaluation/performance/server && ./test.sh throughput

evaluate-performance-cli: evaluate-performance-cli-overhead evaluate-performance-cli-compare ## Run all CLI-based performance evaluations (55min)
evaluate-performance-cli-overhead: node_modules ## Run the CLI overhead evaluation (15min)
	@cd evaluation/performance/cli && ./test.sh cli
evaluate-performance-cli-compare: node_modules ## Run the CLI comparative evaluation (40min)
	@cd evaluation/performance/cli && ./test.sh compare

evaluate-robustness: evaluate-robustness-ns evaluate-robustness-ndg ## Run the robustness evaluation (2min)

evaluate-robustness-ns: node_modules ## Run the robustness evaluation with NodeShield (1min)
	@cd evaluation/robustness && ./test.sh

evaluate-robustness-ndg: ## Run the robustness evaluation with ndg (1min)
	@cd evaluation/robustness && ./test-ndg.sh

evaluate-vulnerabilities: evaluate-vulnerabilities-ns evaluate-vulnerabilities-ndg ## Run the vulnerability evaluation (3min)

evaluate-vulnerabilities-ns: node_modules ## Run the vulnerability evaluation with NodeShield (2min)
	@cd evaluation/vulnerabilities && ./test.sh

evaluate-vulnerabilities-ndg: ## Run the vulnerability evaluation with ndg (1min)
	@cd evaluation/vulnerabilities && ./test-ndg.sh

.PHONY: case-study
case-study: node_modules ## Run the Copay/npm-run-all case study (5min)
	@echo '=== BENIGN ==='
	@cd evaluation/case-study && ./test.sh benign || true
	@echo ''
	@echo '=== MALICIOUS ==='
	@cd evaluation/case-study && ./test.sh malicious || true

# ---------------------------------------------------------------------------- #

node_modules: .npmrc package*.json
	@npm clean-install \
		--no-audit
