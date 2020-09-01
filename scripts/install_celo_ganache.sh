#!/usr/bin/env bash
# Copyright 2020 ChainSafe Systems
# SPDX-License-Identifier: LGPL-3.0-only


# Exit on failure
set -eux

git clone --depth 1 https://github.com/ChainSafe/celo-ganache-cli.git --branch celo-6.4.3-fix-deps --single-branch
npm install --prefix ./celo-ganache-cli
mkdir -p ~/.local/bin
ln -f -s  $PWD/celo-ganache-cli/cli.js  ~/.local/bin/celo-ganache
