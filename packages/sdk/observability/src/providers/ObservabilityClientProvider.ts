//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

// Kept out of `ObservabilityProvider` because these reach `@dxos/client` and `@dxos/protocols`.
// The boot set is the parse graph, so a namespace re-export puts them in the eager graph of every
// consumer of that namespace even where treeshaking would later drop them.
export * as Client from './client-observability.ts';
export * as SyncState from './sync-state.ts';
