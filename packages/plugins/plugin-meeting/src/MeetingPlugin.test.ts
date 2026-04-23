//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { MeetingPlugin } from './MeetingPlugin';

describe('MeetingPlugin', () => {
  test('factory exposes meta', ({ expect }) => {
    expect(MeetingPlugin.meta).toBeDefined();
    expect(MeetingPlugin.meta.id).toBeTypeOf('string');
  });
});
