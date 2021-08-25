#!/bin/bash

#
# Copyright 2021 DXOS.org
#

export REPO_ROOT; REPO_ROOT=$(git rev-parse --show-toplevel)

ORG=dxos

CHANNEL=${1:-latest}

VERSION=`sed "/\/\*.*\*\//d;/\/\*/,/\*\// d" $REPO_ROOT/common/config/rush/version-policies.json | sed 's/\/\/.*//' | jq -r '.[0].version'`
HASH=`git log --pretty=format:'%h' -n 1`

if [ "$CHANNEL" == "dev" ]; then
  TAG="$VERSION.$CHANNEL"
else
  TAG="$VERSION"
fi

set -euo pipefail

function build_docker_image {
  NAME=$1
  # Build and tag the Docker. Save sha256.
  echo "Build Docker Image $NAME."

  # `if [ "$CHANNEL" == "dev" ]; then echo "--build-arg VERSION=@alpha"; fi` \
  docker build \
    --build-arg NPM_TOKEN=$NPM_TOKEN \
    -t "ghcr.io/$ORG/$NAME:$TAG" \
    -t "ghcr.io/$ORG/$NAME:$HASH" \
    -t "ghcr.io/$ORG/$NAME:$CHANNEL" \
    .
}

function push_docker_image {
  NAME=$1
  echo "Pushing Docker Image $NAME."
  docker push "ghcr.io/$ORG/$NAME" --all-tags
}

for pckgdir in `find ./packages/*/* -type d -maxdepth 0`; do
  pushd $pckgdir > /dev/null

  if [ -f "./Dockerfile" -a -f "./IMAGE" ]; then
    IMAGE=`cat ./IMAGE`

    build_docker_image $IMAGE
    push_docker_image $IMAGE
  fi

  popd > /dev/null
done
