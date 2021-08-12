#!/bin/bash

#
# Copyright 2020 DXOS.org
#

# This script waits in app on the whatever web server is used
# Until it starts actually serving the proper index.html file

npm run start &
set +e
i=0
until curl "http://localhost:3000" | grep -q "Tasks App"; do
  i=$((i + 1))
  if [ "$i" -gt 30 ]; then
    exit -1
  fi
  echo "Sleeping..."
  sleep 3
done
