//
// Copyright 2023 DXOS.org
//

// Eager re-export of `InboxPlugin`. See `@dxos/plugin-testing/src/core.ts` for the rationale.
export * from '../InboxPlugin';

export * from './builder';
export * from './data';
export * from './gmail-fixtures';
export * from './jmap-fixtures';
// Type-only (zero runtime cost) so this stays the superset `types` target for `./testing` — the node
// condition resolves its own runtime module; see `./node.ts`.
export type { Jmap } from '../apis';
export type { GmailDataset, JmapDataset } from '../services';
