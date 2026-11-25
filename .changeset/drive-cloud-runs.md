---
'@dxos/plugin-claude': minor
'@dxos/plugin-github': minor
---

Cloud coding runs drive themselves to merged pull requests. Starting a run files a five-minute timer trigger in the space that runs the new `Drive Cloud Coding Runs` operation on EDGE: it folds a running turn, marks tasks done once every pull request has merged, asks the agent to fix failed checks, and asks it to land a pull request a person approved (an approving review, or the `land` label), each follow-up once per pull request and head commit. The Agentic Review check never blocks. `GetPullRequestStatus` now also returns the pull request's labels.
