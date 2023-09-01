#!/bin/sh

ROOT=$(git rev-parse --show-toplevel)


PROFILES_NUMBER=10;
for PROFILE_NUMBER in {1..$PROFILES_NUMBER};
do
    ($ROOT/packages/devtools/cli/testing/multiple-profiles/generate.sh PROFILE$PROFILE_NUMBER &)
done
