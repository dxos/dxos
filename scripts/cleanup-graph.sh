#!/bin/sh

ROOT=$(git rev-parse --show-toplevel)

# NOTE: Sometimes necessary after resolving cycles.
rm $ROOT/.moon/cache/states/workspaceGraph.json
