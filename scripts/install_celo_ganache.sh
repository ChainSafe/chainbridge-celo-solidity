#!/usr/bin/env bash
# Copyright 2020 ChainSafe Systems
# SPDX-License-Identifier: LGPL-3.0-only


# Exit on failure
set -eux

git clone --depth 1 https://github.com/celo-org/ganache-cli.git
npm install --prefix ./ganache-cli
mkdir -p ~/.local/bin
ln -f -s  $PWD/ganache-cli/cli.js  ~/.local/bin/celo-ganache
