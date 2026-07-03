//
// Copyright 2026 DXOS.org
//

// The sync-pipeline machinery (`SyncBinding` service, layer, commit sink) lives in
// `@dxos/plugin-connector`; these are the inbox-specific reusable stages built on top of it.
export { makeDedupStage } from './stages/dedup';
export { type Bodied, htmlToMarkdownStage } from './stages/htmlToMarkdown';
export { type Mapped, extractContactsStage } from './stages/extractContacts';
