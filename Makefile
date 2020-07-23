URL?=http://localhost:8545

.PHONY: test
test:
	@echo " > \033[32mTesting contracts... \033[0m "
	npx truffle test

compile:
	@echo " > \033[32mCompiling contracts... \033[0m "
	npx truffle compile

install-celo-ganache:
	git clone https://github.com/celo-org/ganache-cli.git
	npm install --prefix ./ganache-cli
	ln -f -s  $PWD/ganache-cli/cli.js  ~/.local/bin
	mv ~/.local/bin/cli.js ~/.local/bin/celo-ganache

celo-ganache:
	./scripts/start_celo_ganache.sh

bindings: compile
	@echo " > \033[32mCreating go bindings for ethereum contracts... \033[0m "
	./scripts/create_bindings.sh