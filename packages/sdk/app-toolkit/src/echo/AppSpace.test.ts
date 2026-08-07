//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import * as AppSpace from './AppSpace';

describe('space tags', () => {
  test('hasTag returns true when tag is present', ({ expect }) => {
    const space = { tags: ['personal', 'pinned'] };
    expect(AppSpace.hasTag(space, 'personal')).toBe(true);
    expect(AppSpace.hasTag(space, 'pinned')).toBe(true);
  });

  test('hasTag returns false when tag is absent', ({ expect }) => {
    expect(AppSpace.hasTag({ tags: ['personal'] }, 'archived')).toBe(false);
  });

  test('hasTag handles empty tags', ({ expect }) => {
    expect(AppSpace.hasTag({ tags: [] }, 'personal')).toBe(false);
  });

  test('isSettingsSpace matches the settings tag only', ({ expect }) => {
    expect(AppSpace.isSettingsSpace({ tags: [AppSpace.SETTINGS_SPACE_TAG] })).toBe(true);
    expect(AppSpace.isSettingsSpace({ tags: [AppSpace.PERSONAL_SPACE_TAG] })).toBe(false);
  });

  test('isLegacyDefaultSpace matches the deprecated personal tag', ({ expect }) => {
    expect(AppSpace.isLegacyDefaultSpace({ tags: [AppSpace.PERSONAL_SPACE_TAG] })).toBe(true);
    expect(AppSpace.isLegacyDefaultSpace({ tags: [] })).toBe(false);
  });
});

describe('space visibility', () => {
  test('an untagged space is visible', ({ expect }) => {
    expect(AppSpace.isVisibleSpace({ tags: [] })).toBe(true);
  });

  test('the exemplar space and pre-migration personal spaces stay visible', ({ expect }) => {
    expect(AppSpace.isVisibleSpace({ tags: [AppSpace.EXEMPLAR_SPACE_TAG] })).toBe(true);
    expect(AppSpace.isVisibleSpace({ tags: [AppSpace.PERSONAL_SPACE_TAG] })).toBe(true);
  });

  test('spaces the app manages on the user behalf are hidden', ({ expect }) => {
    expect(AppSpace.isVisibleSpace({ tags: [AppSpace.SETTINGS_SPACE_TAG] })).toBe(false);
    expect(AppSpace.isVisibleSpace({ tags: ['org.dxos.space.filesystem-mirror'] })).toBe(false);
  });
});
