//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { meta } from './meta';

// Smoke test for the `workerd` (Cloudflare Workers) vitest project. It only runs
// under `--project=workerd` (see the `*.workerd.test.ts` include in
// `vitest.base.config.ts`), so reaching this assertion proves the plugin package
// loads inside the worker runtime.
//
// TODO(dmaretskyi): Exercise the full composer testing harness here. The wasm
// stack now loads in workerd (automerge / automerge-subduction served as
// CompiledWasm modules), but the plugin's `*.workerd.ts` variant still pulls
// browser-only UI (lit web components, capture-phase listeners) transitively,
// which the workerd runtime rejects. Making the workerd plugin variant headless
// is the remaining work; the node smoke test in `InboxPlugin.test.ts` covers
// harness activation today.
describe('InboxPlugin (workerd)', () => {
  test('plugin metadata loads in the workerd runtime', ({ expect }) => {
    expect(meta.profile.key).toBe('org.dxos.plugin.inbox');
    expect(meta.profile.name).toBeTypeOf('string');
  });
});
