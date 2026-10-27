---
'@dxos/echo': patch
---

The echo host now runs live queries one at a time, yielding between them, so a cheap query's answer no longer waits for every other query re-run alongside it. Each answer reports its evaluation time (`QueryResponse.executionTime`), and `queryMetrics` and the devtools Queries panel now show that time instead of the time spent waiting for an answer. Importing a binary (`.tar`) space archive now also restores the archive's feed messages, and an import that fails partway deletes the space it created instead of leaving it half-imported.
