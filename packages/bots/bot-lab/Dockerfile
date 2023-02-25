FROM node:18

# Create app directory
WORKDIR /dxos

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY dist/bot/* ./

RUN npm install

EXPOSE 3023
CMD [ "node", "bundle.js" ]