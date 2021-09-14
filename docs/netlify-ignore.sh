#!/bin/bash

if [[ $BRANCH == "production" ]]
then
  exit 1 # Always deploy on production branch
else
  # Deploy only if something has changed.
  git diff --quiet $CACHED_COMMIT_REF $COMMIT_REF .
  exit $? # Exit with above command's status code.
fi
