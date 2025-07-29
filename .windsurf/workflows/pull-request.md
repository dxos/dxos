---
description: Making branches ready for pull-request and submitting pull-requests
---

When I ask you to create a PR make sure to do following steps:

1. Run `pnpm pre-ci` this script will update to the latest main and run checks.
2. If there are any issues with trivial fixes -- implement fixes and re-run. If the issues are not trivial (require significant code changes) -- stop here, and give a summary of the issues with filepaths.
3. Check if there's a PR open (using the gh tool).
4. If there's no PR use `git diff main --no-ext-diff -- ':!pnpm-lock.yaml'` to get the diff and then create a new PR with summary
