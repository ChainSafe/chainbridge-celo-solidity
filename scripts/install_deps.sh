#!/usr/bin/env bash
# Copyright 2020 ChainSafe Systems
# SPDX-License-Identifier: LGPL-3.0-only


set -e

(set -x; npm install)

if [ -x "$(command -v celo-ganache)" ]
then
  echo "celo-ganache found, skipping install"
else
  make install-celo-ganache
fi

if [ -x "$(command -v celo-abigen)" ]
then
  echo "celo-abigen found, skipping install"
else
  make install-celo-node
fi
