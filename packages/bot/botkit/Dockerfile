FROM node:16-alpine

LABEL maintainer="admin@dxos.org"
LABEL description="DXOS Bot Factory."

ARG NPM_TOKEN
ARG VERSION="@latest"

RUN apk --update add --no-cache python3 alpine-sdk libtool autoconf automake

RUN echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" >> /root/.npmrc
RUN npm install --global --unsafe-perm "@dxos/botkit$VERSION"

CMD ["bot-factory"]
