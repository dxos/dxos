//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { DiscordPlugin } from './DiscordPlugin';

describe('DiscordPlugin', () => {
  test('factory exposes meta', ({ expect }) => {
    expect(DiscordPlugin.meta).toBeDefined();
    expect(DiscordPlugin.meta.id).toBeTypeOf('string');
  });
});
