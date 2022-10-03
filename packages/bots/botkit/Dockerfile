FROM node:16

LABEL maintainer="admin@dxos.org"
LABEL description="DXOS Bot Factory."

ARG NPM_TOKEN
ARG VERSION="@dev"

ENV NODE_PATH="/usr/local/share/.config/yarn/global/node_modules"

RUN apt-get update && apt-get install -y g++ make python3 libtool autoconf automake

RUN echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" >> /root/.npmrc
RUN yarn global add ts-node@9.1.1 typescript@4.5.2 @swc-node/register@1.4.2 node-pre-gyp
RUN yarn global add "@dxos/botkit$VERSION"

CMD ["bot-factory"]
