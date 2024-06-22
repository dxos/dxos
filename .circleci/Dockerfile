FROM cimg/base:2022.04

ENV NODE_VERSION 18.19.0
# https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md#global-npm-dependencies
ENV NPM_CONFIG_PREFIX=/home/circleci/.npm-global
ENV PATH=$PATH:/home/circleci/.npm-global/bin

RUN mkdir -p ${NPM_CONFIG_PREFIX}/{bin,lib}

RUN curl -L -o node.tar.xz "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" && \
  sudo tar -xJf node.tar.xz -C /usr/local --strip-components=1 && \
  rm node.tar.xz && \
  sudo ln -s /usr/local/bin/node /usr/local/bin/nodejs

# NOTE: Keep playwright version in sync with the one in package.json
RUN sudo apt-get update \
  && sudo apt-get install -y libxtst-dev libpng++-dev libenchant-2-2 lsof \
  && npx playwright@1.44.1 install-deps \ 
  && npm install -g pnpm@8.15.8
