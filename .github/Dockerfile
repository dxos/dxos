ARG NODE_VERSION=20.12.1

FROM node:${NODE_VERSION}

RUN apt-get update \
  # Install native dependencies.
  && apt-get install -y libxtst-dev libpng++-dev libenchant-2-2 \
  # Install playwright native dependencies.
  # NOTE: Keep playwright version in sync with the one in package.json
  # https://playwright.dev/docs/docker#build-your-own-image
  && npx playwright@1.46.0 install-deps \
  # Cleanup apt cache.
  && rm -rf /var/lib/apt/lists/* \
  # Install pnpm.
  && npm install -g pnpm@9.11.0
