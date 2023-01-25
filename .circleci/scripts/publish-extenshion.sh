#!/bin/bash

EXTENSION=./packages/devtools/devtools-extension

BRANCH=$(git rev-parse --abbrev-ref HEAD)
ROOT=$(git rev-parse --show-toplevel)
PACKAGE=${PWD##*/}
PACKAGE_CAPS=${PACKAGE^^}
PACKAGE_ENV=${PACKAGE_CAPS//-/_}

eval "CLIENT_ID=$"${PACKAGE_ENV}_CLIENT_ID""
eval "CLIENT_SECRET=$"${PACKAGE_ENV}_CLIENT_SECRET""
eval "REFRESH_TOKEN=$"${PACKAGE_ENV}_REFRESH_TOKEN""
eval "APP_ID=$"${PACKAGE_ENV}_APP_ID""

if [ $BRANCH = "production" ]; then
  pushd $EXTENSION

  ZIP_PATH=${ROOT}/artifacts/${PACKAGE}.zip

  mkdir ${ROOT}/artifacts
  zip -r $ZIP_PATH ./out/${PACKAGE}

  ACCESS_TOKEN=$(curl "https://accounts.google.com/o/oauth2/token" -d "client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&refresh_token=${REFRESH_TOKEN}&grant_type=refresh_token&redirect_uri=urn:ietf:wg:oauth:2.0:oob" | jq -r .access_token) \
    curl -H "Authorization: Bearer ${ACCESS_TOKEN}" -H "x-goog-api-version: 2" -X PUT -T $ZIP_PATH -v "https://www.googleapis.com/upload/chromewebstore/v1.1/items/${APP_ID}" \
    curl -H "Authorization: Bearer ${ACCESS_TOKEN}" -H "x-goog-api-version: 2" -H "Content-Length: 0" -X POST -v "https://www.googleapis.com/chromewebstore/v1.1/items/${APP_ID}/publish"

  popd
fi
