URL?=http://localhost:8545

install-deps:
	@echo " > \033[32mInstalling dependencies... \033[0m "
	./scripts/install_deps.sh

.PHONY: test
test:
	@echo " > \033[32mTesting contracts... \033[0m "
	npx truffle test

compile:
	@echo " > \033[32mCompiling contracts... \033[0m "
	npx truffle compile

install-celo-ganache:
	./scripts/install_celo_ganache.sh

celo-ganache:
	./scripts/start_celo_ganache.sh

celo-node:
	./scripts/install_celo_node.sh

bindings: compile
	@echo " > \033[32mCreating go bindings for ethereum contracts... \033[0m "
	./scripts/create_bindings.sh
