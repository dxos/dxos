//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { InboxPlugin } from './InboxPlugin';

describe('InboxPlugin', () => {
  test('factory exposes meta', ({ expect }) => {
    expect(InboxPlugin.meta).toBeDefined();
    expect(InboxPlugin.meta.id).toBeTypeOf('string');
  });
});
