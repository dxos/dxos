//
// Copyright 2026 DXOS.org
//

// Deliberately does NOT re-export `./index` — that pulls `./sync-fixture`, which reaches
// `@dxos/plugin-inbox/sync` and so `@dxos/compute` → `@dxos/ai`, whose parser uses `parsimmon`: a CJS
// module Playwright's esbuild-based Node loader mishandles (`parsimmon.regexp is not a function`). The
// same split, for the same reason, as `@dxos/plugin-inbox`'s `testing/node.ts`. Node consumers get the
// deterministic fixtures plus the API contracts needed to build a faithful HTTP mock.
export * from './jmap-fixtures.ts';
export type { JmapDataset } from '#services';
export type { Jmap } from '#apis';
