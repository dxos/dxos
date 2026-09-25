---
'@dxos/pipeline-email': patch
'@dxos/plugin-inbox': minor
---

Add a cursored, resettable ProcessMailbox pipeline with a start/stop mailbox toolbar action, sync-style progress, and a routine template; AnalyzeMailbox now reports progress, no longer adopts other consumers' feed cursors, and fact extraction processes unordered feeds oldest-first so the cursor cannot skip unprocessed messages.
