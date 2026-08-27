//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { type Space, SpaceState } from '@dxos/client/echo';

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

describe('settings space resolution', () => {
  test('tagged spaces order by id, not list order', ({ expect }) => {
    // Healing deletes everything but the first entry, so the order must be identical on every
    // device regardless of how the local list happens to be arranged.
    const second = makeClosedSpace('B00000000000000000000000000000002', [AppSpace.SETTINGS_SPACE_TAG]);
    const first = makeClosedSpace('B00000000000000000000000000000001', [AppSpace.SETTINGS_SPACE_TAG]);
    expect(AppSpace.getSettingsSpaces({ spaces: { get: () => [second, first] } }).map((space) => space.id)).toEqual([
      first.id,
      second.id,
    ]);
    expect(AppSpace.getSettingsSpaces({ spaces: { get: () => [first, second] } }).map((space) => space.id)).toEqual([
      first.id,
      second.id,
    ]);
    // With no readable designation the read-side resolution falls back to the same order.
    expect(AppSpace.getSettingsSpace({ spaces: { get: () => [second, first] } })?.id).toBe(first.id);
  });
});

/**
 * A stand-in carrying only the fields the tag predicates read. Cast here rather than widening the
 * predicates, so production code sees a real `Space` and the fake stays contained to the test.
 */
const makeSpace = (tags: string[]): Space => ({ tags, properties: {} }) as unknown as Space;

/** As {@link makeSpace}, adding the id and closed state the settings-space resolution reads. */
const makeClosedSpace = (id: string, tags: string[]): Space =>
  ({ id, tags, properties: {}, state: { get: () => SpaceState.SPACE_CLOSED } }) as unknown as Space;
