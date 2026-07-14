//
// Copyright 2026 DXOS.org
//

// The generic sync-pipeline machinery (`SyncBinding` service, layer, run, commit, dedupStage) and the
// generic reusable email stages live below the plugin layer (`@dxos/plugin-connector`,
// `@dxos/pipeline-email`'s `EmailStage`). `EmailCommit` and `FactCommit` are the two terminal commit
// stages coupled to `SyncBinding`, so they stay here. `onArrivalExtractors` (app-framework-coupled:
// resolves extractor capabilities from the plugin registry) lives in `../util/mailbox-sync` instead,
// next to the `runOnArrivalExtractors` it wraps.
export * as EmailCommit from './EmailCommit';
export * as FactCommit from './FactCommit';
