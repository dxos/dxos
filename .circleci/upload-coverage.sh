#! /bin/bash

# https://docs.codecov.com/docs/codecov-uploader

curl https://keybase.io/codecovsecurity/pgp_keys.asc | gpg --no-default-keyring --keyring trustedkeys.gpg --import

curl -Os https://uploader.codecov.io/latest/linux/codecov

curl -Os https://uploader.codecov.io/latest/linux/codecov.SHA256SUM

curl -Os https://uploader.codecov.io/latest/linux/codecov.SHA256SUM.sig

gpgv codecov.SHA256SUM.sig codecov.SHA256SUM

shasum -a 256 -c codecov.SHA256SUM

chmod +x codecov

for file in `find ./coverage -name 'clover.xml'`; do
  echo "Uploading $file"
  ./codecov -t $CODECOV_TOKEN -f $file
done
