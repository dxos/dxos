---
'@dxos/plugin-connector': patch
'@dxos/types': patch
---

Move `DraftMessage` out of `@dxos/plugin-inbox` into `@dxos/types`, and move the generic email-sync pipeline stages (excluding the `SyncBinding`-coupled `toCommitUnit`) out of `@dxos/plugin-inbox` into `@dxos/pipeline-email`, and the generic `FactUnit` type out of the email pipeline into `@dxos/pipeline-rdf`, so these can be reused without depending on a full app-framework plugin. `Connection`, `SyncBinding`, and `DerivedBinding` remain in `@dxos/plugin-connector`; `toCommitUnit` and `factsCommit` (both coupled to `SyncBinding`) live in `@dxos/plugin-inbox`.
