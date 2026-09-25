//
// Copyright 2025 DXOS.org
//

// Deliberately-scoped internal surface for migration tooling.
// External consumers must not import from this path outside of @dxos/sdk/migrations.

export { ObjectCore } from '../core-db/object-core.ts';
export { type DocHandleProxy } from '../automerge/doc-handle-proxy.ts';
export { type RepoProxy } from '../automerge/repo-proxy.ts';
export { migrateDocument } from '../util/migrate-document.ts';
