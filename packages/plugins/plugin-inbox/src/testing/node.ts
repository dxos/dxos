//
// Copyright 2026 DXOS.org
//

// Deliberately does NOT re-export `./index` (or `#plugin`) — both InboxPlugin variants (tsx and the
// node-safe one) still import `#types`'s `Mailbox`, which imports `@dxos/compute`'s `Instructions`;
// `@dxos/compute` depends on `@dxos/ai`, whose parser uses `parsimmon` — a CJS module Playwright's
// esbuild-based Node loader mishandles differently than Vite does (confirmed by reproducing the
// crash with `InboxPlugin.node.ts` too, not just the full `.tsx`). Node consumers get just the
// provider fixtures plus the API contracts needed to build a faithful HTTP mock.
export * from './gmail-fixtures';
export * from './jmap-fixtures';
export type { Jmap } from '../apis';
export type { GmailDataset, JmapDataset } from '../services';
