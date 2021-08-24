FROM node:16-alpine

LABEL maintainer="admin@dxos.org"
LABEL description="DXOS Bot Factory."

ARG NPM_TOKEN
ARG CLI_VER="@latest"

RUN apk --update add --no-cache python3 alpine-sdk libtool autoconf automake

RUN echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" >> /root/.npmrc
RUN npm install --global --unsafe-perm "@dxos/cli$CLI_VER" "@dxos/cli-dxns$CLI_VER" "@dxos/cli-data$CLI_VER" "@dxos/cli-bot$CLI_VER"
RUN dx profile init --name local --template-url https://git.io/Jfrn0

CMD ["bot-factory"]
