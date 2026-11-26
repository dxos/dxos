//
// Copyright 2026 DXOS.org
//

import { describe, onTestFinished, test, vi } from 'vitest';

import { Context } from '@dxos/context';

import { whenPageVisible } from './util.ts';

describe('whenPageVisible', () => {
  test('a hidden page resolves at once when the context is already disposed', async ({ expect }) => {
    vi.stubGlobal('document', Object.assign(new EventTarget(), { visibilityState: 'hidden' }));
    onTestFinished(() => {
      vi.unstubAllGlobals();
    });
    const ctx = new Context();
    await ctx.dispose();

    await expect(whenPageVisible(ctx)).resolves.toBeUndefined();
  });
});
