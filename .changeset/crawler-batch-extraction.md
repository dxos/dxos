---
'@dxos/pipeline': minor
'@dxos/pipeline-rdf': minor
'@dxos/crawler': minor
---

Crawl fact extraction runs in batches. `Stage.batch` groups consecutive items (optionally weighted) and runs one effect per group. `indexFactsBatch` / `indexFactsBatchStage` / `FactPipeline.runBatch` extract several documents as one tagged transcript per model request and attribute each fact back to its message, skipping documents whose cursor already matches. The crawler's `extractFactsStage` batches 25 messages per request by default (`batchSize: 1` keeps one request per message).
