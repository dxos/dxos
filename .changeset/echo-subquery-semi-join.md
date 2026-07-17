---
'@dxos/echo': minor
'@dxos/plugin-inbox': minor
---

Add a correlated semi-join query primitive: `Filter.in(query.project('property'))` matches objects whose property is in the set of values projected from a subquery's results (an uncorrelated `col IN (SELECT property FROM ...)`), resolved once per reactive run and re-executed when the subquery's inputs change. The mailbox list now uses this to group whole threads — across the feed and this mailbox's space-scoped drafts — instead of only the messages that directly match the active filter, so thread counts and previews reflect the full conversation.
