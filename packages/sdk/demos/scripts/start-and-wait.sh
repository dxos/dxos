#!/bin/sh

#
# Copyright 2020 DXOS.org
#

# This script waits in app on the whatever web server is used
# Until it starts actually serving the proper index.html file

rushx storybook --quiet & 
set +e
i=0
until curl "http://localhost:9001" | grep -q "Storybook"
do
  ((i++))
  if [ "$i" -gt 30 ]
  then
    exit -1
  fi
  echo "Sleeping..."
  sleep 3
done
