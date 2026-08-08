//
// Copyright 2026 DXOS.org
//

// Deliberately does NOT re-export `./index` — that pulls `./sync-fixture`, which reaches
// `@dxos/plugin-inbox/sync` and so `@dxos/compute` → `@dxos/ai`, whose parser uses `parsimmon`: a CJS
// module Playwright's esbuild-based Node loader mishandles (`parsimmon.regexp is not a function`). Node
// consumers get the deterministic fixtures plus the contracts needed to build a faithful HTTP mock.
export * from './calendar-fixtures';
export * from './gmail-fixtures';
export type { GmailDataset } from '../services';
