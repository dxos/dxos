//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { YouTubePlugin } from './YouTubePlugin';

describe('YouTubePlugin', () => {
  test('factory exposes meta', ({ expect }) => {
    expect(YouTubePlugin.meta).toBeDefined();
    expect(YouTubePlugin.meta.id).toBeTypeOf('string');
  });
});
