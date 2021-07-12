FROM node:12.22.1-alpine

LABEL maintainer="admin@dxos.org"
LABEL description="DXOS signal service."

ARG NPM_TOKEN

RUN apk --update add --no-cache python alpine-sdk libtool autoconf automake

RUN echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" >> /root/.npmrc
RUN npm install --global --unsafe-perm @dxos/signal

EXPOSE 3478 4000

CMD ["signal"]
