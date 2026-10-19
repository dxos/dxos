---
'@dxos/echo': minor
---

Trace feeds are no longer indexed: queries scoped to a trace feed read it directly through the feed's live subscription, so trace appends no longer start index passes, and the rows earlier releases indexed are dropped on first open. The local host now prunes `operation.start`/`operation.end` trace messages older than seven days, compacting existing spaces shortly after startup. Space-wide queries with `includeFeeds` no longer return trace messages, and `Scope.feed` takes an optional `namespace`.
