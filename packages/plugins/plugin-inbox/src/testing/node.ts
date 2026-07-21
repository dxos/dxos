//
// Copyright 2026 DXOS.org
//

// Deliberately does NOT re-export `./index` — that pulls in `InboxPlugin` and its full UI/CSS
// dependency tree, which breaks under Playwright's plain Node/ESM test loader (no `.pcss` support,
// unlike a real Vite bundle). Nor `./builder`/`./data` — those pull in `Mailbox` (`@dxos/compute`'s
// `Instructions`), which transitively reaches the AI parser's `parsimmon` dependency; Playwright's
// esbuild-based loader mishandles that CJS module differently than Vite does. Node consumers get just
// the provider fixtures plus the API contracts needed to build a faithful HTTP mock.
export * from './gmail-fixtures';
export * from './jmap-fixtures';
export type { Jmap } from '../apis';
export type { GmailDataset, JmapDataset } from '../services';
