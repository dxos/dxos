#!/bin/sh

NUM=${1:-1}
SLEEP=${2:-1}

ACCOUNT="hello@dxos.network"

for (( i=1; i<=NUM; i++ ))
do
  TEXT=$(curl -s https://api.quotable.io/random | jq -r ".content")
  CITY=$(curl -s https://randomuser.me/api | jq -r ".results[0].location.city")
  echo ${TEXT} | mail -s "Hello ${CITY}" ${ACCOUNT}
  echo "Message ${i}"
  sleep ${SLEEP}
done
