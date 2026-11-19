---
'@dxos/plugin-github': patch
---

GitHub pull request operations (`GetPullRequestStatus`, `SyncPullRequest`, review verbs) load the pull request when it arrives as a ref that is not yet loaded, as it does in a nested call from another plugin's bundle on EDGE.
