---
'@dxos/plugin-connector': minor
'@dxos/types': patch
---

Move `Connection`, `SyncBinding`, `DerivedBinding`, and `DraftMessage` out of `@dxos/plugin-connector` (and `@dxos/plugin-inbox`) into `@dxos/types`, move the generic email-sync pipeline stages out of `@dxos/plugin-inbox` into `@dxos/pipeline-email`, and move the generic `factsCommit`/`FactUnit` fact-commit sink out of the email pipeline into `@dxos/pipeline-rdf`, so sync pipelines can be built without depending on a full app-framework plugin. Consumers previously importing these from `@dxos/plugin-connector` must import them from `@dxos/types` instead.
