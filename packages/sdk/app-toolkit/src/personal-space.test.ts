//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { hasTag, isPersonalSpace, PERSONAL_SPACE_TAG } from './personal-space';

describe('personal-space', () => {
  test('hasTag returns true when tag is present', ({ expect }) => {
    const space = { tags: ['personal', 'pinned'] } as any;
    expect(hasTag(space, 'personal')).toBe(true);
    expect(hasTag(space, 'pinned')).toBe(true);
  });

  test('hasTag returns false when tag is absent', ({ expect }) => {
    const space = { tags: ['personal'] } as any;
    expect(hasTag(space, 'archived')).toBe(false);
  });

  test('hasTag handles empty tags', ({ expect }) => {
    const space = { tags: [] } as any;
    expect(hasTag(space, 'personal')).toBe(false);
  });

  test('isPersonalSpace returns true for space with personal tag', ({ expect }) => {
    const space = { tags: [PERSONAL_SPACE_TAG] } as any;
    expect(isPersonalSpace(space)).toBe(true);
  });

  test('isPersonalSpace returns false for regular space', ({ expect }) => {
    const space = { tags: [] } as any;
    expect(isPersonalSpace(space)).toBe(false);
  });
});
