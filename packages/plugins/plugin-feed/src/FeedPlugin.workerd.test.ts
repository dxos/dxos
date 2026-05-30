//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { meta } from './meta';

// Smoke test for the `workerd` (Cloudflare Workers) vitest project. It only runs
// under `--project=workerd` (see the `*.workerd.test.ts` include in
// `vitest.base.config.ts`), so reaching this assertion proves the plugin package
// loads inside the worker runtime.
//
// TODO(dmaretskyi): Exercise the full composer testing harness here. Today the
// harness transitively instantiates the `@automerge/automerge` wasm via the
// plugin's ECHO schema, and that wasm-bindgen `workerd` build crashes the
// workerd runtime under `@cloudflare/vitest-pool-workers`. The node smoke test
// in `FeedPlugin.test.ts` covers harness activation in the meantime.
describe('FeedPlugin (workerd)', () => {
  test('plugin metadata loads in the workerd runtime', () => {
    expect(meta.id).toBe('org.dxos.plugin.feed');
    expect(meta.name).toBeTypeOf('string');
  });
});
