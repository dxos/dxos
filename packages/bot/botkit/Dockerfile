FROM node:16

LABEL maintainer="admin@dxos.org"
LABEL description="DXOS Bot Factory."

ARG NPM_TOKEN
ARG VERSION="@latest"

RUN apt-get update && apt-get -y install python3 libtool autoconf automake

RUN echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" >> /root/.npmrc
RUN npm install node-pre-gyp -g
RUN npm install --global --unsafe-perm "@dxos/botkit$VERSION"

CMD ["bot-factory"]
