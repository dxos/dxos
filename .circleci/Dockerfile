FROM mcr.microsoft.com/playwright:v1.43.1-jammy

ENV NODE_VERSION 20.19.0

RUN mkdir -p ${NPM_CONFIG_PREFIX}/{bin,lib}

# Node
RUN curl -L -o node.tar.xz "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" && \
  sudo tar -xJf node.tar.xz -C /usr/local --strip-components=1 && \
  rm node.tar.xz && \
  sudo ln -s /usr/local/bin/node /usr/local/bin/nodejs

# Deps
RUN sudo apt-get update
RUN sudo apt-get install -y libxtst-dev libpng++-dev libenchant-2-2 lsof rsync
RUN sudo apt-get install -y pnpm
