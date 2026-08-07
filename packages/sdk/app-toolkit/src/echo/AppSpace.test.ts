//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { type Space } from '@dxos/client/echo';

import * as AppSpace from './AppSpace';

describe('space tags', () => {
  test('hasTag returns true when tag is present', ({ expect }) => {
    const space = makeSpace(['personal', 'pinned']);
    expect(AppSpace.hasTag(space, 'personal')).toBe(true);
    expect(AppSpace.hasTag(space, 'pinned')).toBe(true);
  });

  test('hasTag returns false when tag is absent', ({ expect }) => {
    expect(AppSpace.hasTag(makeSpace(['personal']), 'archived')).toBe(false);
  });

  test('hasTag handles empty tags', ({ expect }) => {
    expect(AppSpace.hasTag(makeSpace([]), 'personal')).toBe(false);
  });

  test('isSettingsSpace matches the settings tag only', ({ expect }) => {
    expect(AppSpace.isSettingsSpace(makeSpace([AppSpace.SETTINGS_SPACE_TAG]))).toBe(true);
    expect(AppSpace.isSettingsSpace(makeSpace([AppSpace.PERSONAL_SPACE_TAG]))).toBe(false);
  });

  test('isLegacyDefaultSpace matches the deprecated personal tag', ({ expect }) => {
    expect(AppSpace.isLegacyDefaultSpace(makeSpace([AppSpace.PERSONAL_SPACE_TAG]))).toBe(true);
    expect(AppSpace.isLegacyDefaultSpace(makeSpace([]))).toBe(false);
  });
});

describe('space visibility', () => {
  test('an untagged space is visible', ({ expect }) => {
    expect(AppSpace.isVisibleSpace(makeSpace([]))).toBe(true);
  });

  test('the exemplar space and pre-migration personal spaces stay visible', ({ expect }) => {
    expect(AppSpace.isVisibleSpace(makeSpace([AppSpace.EXEMPLAR_SPACE_TAG]))).toBe(true);
    expect(AppSpace.isVisibleSpace(makeSpace([AppSpace.PERSONAL_SPACE_TAG]))).toBe(true);
  });

  test('spaces the app manages on the user behalf are hidden', ({ expect }) => {
    expect(AppSpace.isVisibleSpace(makeSpace([AppSpace.SETTINGS_SPACE_TAG]))).toBe(false);
    expect(AppSpace.isVisibleSpace(makeSpace(['org.dxos.space.filesystem-mirror']))).toBe(false);
  });
});

/**
 * A stand-in carrying only the fields the tag predicates read. Cast here rather than widening the
 * predicates, so production code sees a real `Space` and the fake stays contained to the test.
 */
const makeSpace = (tags: string[]): Space => ({ tags, properties: {} }) as unknown as Space;
