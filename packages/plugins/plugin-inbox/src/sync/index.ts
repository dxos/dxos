//
// Copyright 2026 DXOS.org
//

// The generic sync-pipeline machinery (`SyncBinding` service, layer, run, commit, dedupStage) lives
// in `@dxos/plugin-connector`; these are the inbox-specific reusable email stages built on top of it.
export * as EmailStage from './EmailStage';
