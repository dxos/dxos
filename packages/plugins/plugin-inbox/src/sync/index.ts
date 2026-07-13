//
// Copyright 2026 DXOS.org
//

// The generic sync-pipeline machinery (`SyncBinding` service, layer, run, commit, dedupStage) lives
// in `@dxos/types`; the generic reusable email stages live in `@dxos/pipeline-email`'s `EmailStage`
// namespace, and the fact-commit sink in `@dxos/pipeline-rdf`. `onArrivalExtractors` is the one
// app-framework-coupled stage that stays here, resolving extractor capabilities from the plugin
// registry.
export { onArrivalExtractors } from './on-arrival-extractors';
