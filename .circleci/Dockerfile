FROM cimg/base:2022.04

ENV NODE_VERSION 16.14.0
# https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md#global-npm-dependencies
ENV NPM_CONFIG_PREFIX=/home/circleci/.npm-global
ENV PATH=$PATH:/home/circleci/.npm-global/bin

RUN curl -L -o node.tar.xz "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" && \
  sudo tar -xJf node.tar.xz -C /usr/local --strip-components=1 && \
  rm node.tar.xz && \
  sudo ln -s /usr/local/bin/node /usr/local/bin/nodejs

RUN sudo apt-get update \
  && sudo apt-get install -y libxtst-dev libpng++-dev \
  && npx playwright@1.25.0 install-deps \
  && npm install -g pnpm

# TODO(wittjosiah): Add CI job to publish this automatically.
