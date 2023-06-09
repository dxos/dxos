#
# Copyright 2023 DXOS.org
#

FROM node:18

# Create app directory
WORKDIR /dxos

COPY dist/bot/package*.json ./

RUN npm install

# Install app dependencies.
# A wildcard is used to ensure both package.json AND package-lock.json are copied where available (npm@5+)
COPY dist/bot/* ./

# Config
COPY config ./

EXPOSE 7400

CMD [ "node", "bundle.js" ]
