---
'@dxos/app-toolkit': minor
'@dxos/plugin-trello': patch
---

Connector syncs report a progress meter. `Progress.withReporter` (with `makeReporter` and `createSyncKey`) starts a meter for one run and ends it with the run's outcome. Trello, Linear, GitHub, Slack and Google Contacts report one meter per synced board, team, repo, channel or group, with the exact total set from the listing before anything is processed. The magazine feed sync's total is now the posts it adds rather than every post it fetched. Google Calendar reports a count of events synced, since its API returns no total.
