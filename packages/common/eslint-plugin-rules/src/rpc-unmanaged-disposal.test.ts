//
// Copyright 2026 DXOS.org
//

import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';

import rule from '../rules/rpc-unmanaged-disposal.js';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parser: await import('@typescript-eslint/parser'),
  },
});

const undisposed = [{ messageId: 'undisposed' }];

describe('rpc-unmanaged-disposal', () => {
  it('requires every getUnmanaged() value to be held by `using` or handed to an owner', () => {
    ruleTester.run('rpc-unmanaged-disposal', rule, {
      valid: [
        'async () => { using sink = await B.getUnmanaged().getRouterSink(ctx, id); };',
        'async () => { await using sink = await B.getUnmanaged().getRouterSink(ctx, id); };',
        "new RpcStubCache('router-sink', async (id) => B.getUnmanaged().getRouterSink(ctx, id));",
        "new RpcStubCache('s', async (id) => { return B.getUnmanaged().getRouterSink(ctx, id); });",
        'async () => { using sink = await NS.getUnmanaged().getByName(id).getRouterSink(); };',
        // A managed call is disposed by the binding.
        'async () => { await B.get().sendMessage(ctx, msg); };',
        {
          code: "new SinkPool('s', async (id) => B.getUnmanaged().getRouterSink(ctx, id));",
          options: [{ owners: ['SinkPool'] }],
        },
      ],
      invalid: [
        { code: 'async () => { const sink = await B.getUnmanaged().getRouterSink(ctx, id); };', errors: undisposed },
        { code: 'async () => { await B.getUnmanaged().getRouterSink(ctx, id); };', errors: undisposed },
        { code: 'const svc = B.getUnmanaged();', errors: undisposed },
        { code: 'async () => { this._sink = await B.getUnmanaged().getRouterSink(ctx, id); };', errors: undisposed },
        { code: "new Map([['k', B.getUnmanaged()]]);", errors: undisposed },
        { code: 'const f = async () => B.getUnmanaged().getRouterSink(ctx, id);', errors: undisposed },
        // Only the configured owners take ownership.
        { code: "new SinkPool('s', async (id) => B.getUnmanaged().getRouterSink(ctx, id));", errors: undisposed },
      ],
    });
  });
});
