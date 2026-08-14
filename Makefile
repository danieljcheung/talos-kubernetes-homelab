.PHONY: help build sync verify test build-cozy sync-cozy verify-cozy test-api

help: ## Show this help message
	@echo "Talos Kubernetes Homelab Site targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

build: ## Build the React portfolio site
	@echo "Building portfolio site..."
	@npm --prefix site run build

sync: ## Sync built site assets to ConfigMap
	@echo "Syncing site/dist assets to manifests/nginx/configmap.yaml..."
	@node scripts/generate-configmap.mjs

verify: ## Verify ConfigMap matches built assets (checks if stale)
	@echo "Verifying ConfigMap matches built assets..."
	@node scripts/generate-configmap.mjs --check

build-cozy: ## Build the Cozy Friends companion site
	@test -n "$${VITE_TURNSTILE_SITE_KEY:-}" || (echo "VITE_TURNSTILE_SITE_KEY must be set before building Cozy Friends." >&2; exit 1)
	@case "$${VITE_TURNSTILE_SITE_KEY}" in *-TEST) echo "VITE_TURNSTILE_SITE_KEY must be a registered production widget key, not a Turnstile test key." >&2; exit 1;; esac
	@VITE_COZY_ASSET_VERSION=$$(git rev-parse --short HEAD) npm --prefix site run build:cozy

sync-cozy: ## Sync Cozy Friends assets to its ConfigMap
	@echo "Syncing site/dist-cozy assets to manifests/cozy-friends-site/configmap.yaml..."
	@node scripts/generate-configmap.mjs --dist site/dist-cozy --configmap manifests/cozy-friends-site/configmap.yaml

verify-cozy: ## Verify Cozy Friends ConfigMap matches built assets
	@echo "Verifying Cozy Friends ConfigMap matches built assets..."
	@node scripts/generate-configmap.mjs --check --dist site/dist-cozy --configmap manifests/cozy-friends-site/configmap.yaml

test-api: ## Run approval API unit tests
	@python3 -m unittest discover -s cozy-approval-api -p 'test_*.py'

test: ## Run frontend, generator, and approval API tests
	@echo "Running frontend tests..."
	@npm --prefix site test
	@echo "Running generator unit tests..."
	@node --test scripts/generate-configmap.test.mjs
	@echo "Running approval API unit tests..."
	@python3 -m unittest discover -s cozy-approval-api -p 'test_*.py'
