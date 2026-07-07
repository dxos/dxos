//
// Copyright 2025 DXOS.org
//

// Deliberately-scoped internal surface for migration tooling.
// External consumers must not import from this path outside of @dxos/sdk/migrations.

export { ObjectCore } from '../core-db/object-core';
export { type DocHandleProxy } from '../automerge/doc-handle-proxy';
export { type RepoProxy } from '../automerge/repo-proxy';
export { migrateDocument } from '../util/migrate-document';
export {
  decode,
  digestBytes,
  digestHex,
  digestHexFromBytes,
  encode,
  fromDigest,
  fromDigestHex,
} from '../blob/ni-uri';
