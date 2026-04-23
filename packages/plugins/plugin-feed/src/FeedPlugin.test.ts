//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { FeedPlugin } from './FeedPlugin';

describe('FeedPlugin', () => {
  test('factory exposes meta', ({ expect }) => {
    expect(FeedPlugin.meta).toBeDefined();
    expect(FeedPlugin.meta.id).toBeTypeOf('string');
  });
});
