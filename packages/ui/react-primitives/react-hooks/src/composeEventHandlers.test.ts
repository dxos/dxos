//
// Copyright 2026 DXOS.org
//

import { describe, expect, test, vi } from 'vitest';

import { composeEventHandlers } from './composeEventHandlers';

describe('composeEventHandlers', () => {
  test('skips ours when the consumer prevented default', () => {
    const ours = vi.fn();
    composeEventHandlers(
      (event: { defaultPrevented: boolean }) => (event.defaultPrevented = true),
      ours,
    )({
      defaultPrevented: false,
    });
    expect(ours).not.toHaveBeenCalled();
    composeEventHandlers(undefined, ours)({ defaultPrevented: false });
    expect(ours).toHaveBeenCalledTimes(1);
  });
});
