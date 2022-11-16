#!/bin/sh

# Install tools

npm -g i monorepo-cd
npm -g i git-branch-select

# Copy plugin to custom dir.

DIR=$(cd "$(dirname "$0")"; pwd -P)

DEST=${ZSH_CUSTOM:-~/.oh-my-zsh/custom}

rm -f "$DEST/plugins/dxos"
ln -s "$DIR/ohmyz/plugins/dxos" "$DEST/plugins/"
