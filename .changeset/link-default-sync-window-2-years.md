---
'@dxos/link': minor
---

Widen the default mail-sync backfill window: `resolveHorizon`'s `defaultSyncBackDays` goes from 30 days to 2 years. Callers that do not pass an explicit `syncBackDays` (e.g. the inbox sync routine) will backfill two years of history on first sync instead of one month.
