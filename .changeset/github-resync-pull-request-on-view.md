---
'@dxos/plugin-github': minor
---

Re-sync a pull request from GitHub when its article or card is shown (at most once every five minutes per pull request): the new `SyncPullRequest` operation writes back whichever of its title, state, description, branches and size changed, so a stored pull request no longer goes stale between repository syncs.
