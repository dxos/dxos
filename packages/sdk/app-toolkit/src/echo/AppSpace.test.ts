//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import * as AppSpace from './AppSpace';

describe('personal-space', () => {
  test('hasTag returns true when tag is present', ({ expect }) => {
    const space = { tags: ['personal', 'pinned'] } as any;
    expect(AppSpace.hasTag(space, 'personal')).toBe(true);
    expect(AppSpace.hasTag(space, 'pinned')).toBe(true);
  });

  test('hasTag returns false when tag is absent', ({ expect }) => {
    const space = { tags: ['personal'] } as any;
    expect(AppSpace.hasTag(space, 'archived')).toBe(false);
  });

  test('hasTag handles empty tags', ({ expect }) => {
    const space = { tags: [] } as any;
    expect(AppSpace.hasTag(space, 'personal')).toBe(false);
  });

  test('isPersonalSpace returns true for space with personal tag', ({ expect }) => {
    const space = { tags: [AppSpace.PERSONAL_SPACE_TAG] } as any;
    expect(AppSpace.isPersonalSpace(space)).toBe(true);
  });

  test('isPersonalSpace returns false for regular space', ({ expect }) => {
    const space = { tags: [] } as any;
    expect(AppSpace.isPersonalSpace(space)).toBe(false);
  });
});
