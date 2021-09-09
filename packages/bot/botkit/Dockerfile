FROM node:16

LABEL maintainer="admin@dxos.org"
LABEL description="DXOS Bot Factory."

ARG NPM_TOKEN
ARG VERSION="@latest"

ENV DX_CLI_NODE_PATH="/usr/local/share/.config/yarn/global/node_modules"

RUN apt-get update && apt-get install -y g++ make python3 libtool autoconf automake

RUN echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" >> /root/.npmrc
RUN npm install node-pre-gyp -g
RUN yarn global add "@dxos/botkit$VERSION"
RUN cp -r /usr/local/share/.config/yarn/global/node_modules/sodium-native/prebuilds /usr/local/bin/prebuilds

CMD ["bot-factory"]
