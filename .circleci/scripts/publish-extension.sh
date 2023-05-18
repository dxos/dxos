#!/bin/bash

EXTENSION=./packages/devtools/devtools-extension

BRANCH=$(git rev-parse --abbrev-ref HEAD)
ROOT=$(git rev-parse --show-toplevel)

# See https://developer.chrome.com/docs/webstore/using_webstore_api/
if [ $BRANCH = "production" ]; then
  pushd $EXTENSION

  PACKAGE=${PWD##*/}
  PACKAGE_CAPS=${PACKAGE^^}
  PACKAGE_ENV=${PACKAGE_CAPS//-/_}

  eval "CLIENT_ID=$"${PACKAGE_ENV}_CLIENT_ID""
  eval "CLIENT_SECRET=$"${PACKAGE_ENV}_CLIENT_SECRET""
  eval "AUTH_CODE=$"${PACKAGE_ENV}_AUTH_CODE""
  eval "APP_ID=$"${PACKAGE_ENV}_APP_ID""

  ZIP_PATH=${ROOT}/artifacts/${PACKAGE}.zip
  mkdir ${ROOT}/artifacts
  zip -r $ZIP_PATH ./out/${PACKAGE}

  # NOTE: you can curl ACCESS_TOKEN only once per hour with AUTH_CODE. 
  #   That ACCESS_TOKEN will be valid for an hour, and in ideal world you need to store it, because you can not curl it again for this hour.
  #   In our use case, it is ok to be able to run this script only once per hour and to not store ACCESS_TOKEN anywhere, because extension publish takes more than a day.
  echo ---------------------------------------------------
  ACCESS_TOKEN=$(curl "https://accounts.google.com/o/oauth2/token" -d "client_id=$CLIENT_ID&client_secret=$CLIENT_SECRET&code=$AUTH_CODE&grant_type=authorization_code&redirect_uri=urn:ietf:wg:oauth:2.0:oob" | jq -r .access_token)
  echo "${PACKAGE_ENV}: Obtained ACCESS_TOKEN: ${ACCESS_TOKEN}"

  echo ---------------------------------------------------
  curl -H "Authorization: Bearer $ACCESS_TOKEN" -H "x-goog-api-version: 2" -X PUT -T $ZIP_PATH https://www.googleapis.com/upload/chromewebstore/v1.1/items/${APP_ID}
  echo "${PACKAGE_ENV}: Uploaded extension bundle"

  echo ---------------------------------------------------
  curl -H "Authorization: Bearer ${ACCESS_TOKEN}" -H "x-goog-api-version: 2" -H "Content-Length: 0" -X POST -v "https://www.googleapis.com/chromewebstore/v1.1/items/${APP_ID}/publish"
  echo "${PACKAGE_ENV}: Posted bundle for review"
  popd
fi
