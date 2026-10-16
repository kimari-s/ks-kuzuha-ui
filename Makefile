.PHONY: help install dev build typecheck preview clean

# Optional: the instance config (see README "Instance config") and an
# absolute asset prefix, e.g.
#   make build KUZUHA_CONFIG=deploy/example.json VITE_BASE_PATH=/bbs/
KUZUHA_CONFIG ?=
VITE_BASE_PATH ?=

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*##' $(MAKEFILE_LIST) | awk -F ':.*## ' '{printf "  %-16s %s\n", $$1, $$2}'

install: ## Install npm deps
	npm install

dev: ## Run vite dev server
	npm run dev

typecheck: ## tsc -b --noEmit
	npm run typecheck

build: ## Production build into ./dist (KUZUHA_CONFIG, VITE_BASE_PATH optional)
	KUZUHA_CONFIG=$(KUZUHA_CONFIG) VITE_BASE_PATH=$(VITE_BASE_PATH) npm run build

preview: build ## Build then vite preview locally
	npm run preview

clean: ## Remove build artefacts
	rm -rf dist
