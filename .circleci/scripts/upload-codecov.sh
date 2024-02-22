#!/bin/bash

# Skip code coverage upload for forks to avoid passing CI secrets to forks.
if [ -z $CODECOV_TOKEN ]; then
  exit 0
fi

# This file is referenced from the .circleci/config.yml
# https://docs.codecov.com/docs/codecov-uploader

curl https://keybase.io/codecovsecurity/pgp_keys.asc | gpg --no-default-keyring --keyring trustedkeys.gpg --import

curl -Os https://uploader.codecov.io/latest/linux/codecov
curl -Os https://uploader.codecov.io/latest/linux/codecov.SHA256SUM
curl -Os https://uploader.codecov.io/latest/linux/codecov.SHA256SUM.sig

gpgv codecov.SHA256SUM.sig codecov.SHA256SUM

shasum -a 256 -c codecov.SHA256SUM

chmod +x codecov

./codecov -t $CODECOV_TOKEN --dir coverage
