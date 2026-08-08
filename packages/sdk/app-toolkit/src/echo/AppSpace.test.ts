//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { type Space, SpaceState } from '@dxos/client/echo';
import { Annotation, Obj } from '@dxos/echo';
import { Expando } from '@dxos/schema';

import * as AppAnnotation from './AppAnnotation';
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

describe('getSettingsSpace', () => {
  test('returns undefined when the profile has none', ({ expect }) => {
    expect(AppSpace.getSettingsSpace(makeClient([makeSpace([])]))).toBeUndefined();
  });

  test('picks the same duplicate regardless of space list order', ({ expect }) => {
    // Two clients that both observe no settings space both create one. Whichever the app then
    // reads has to be the same on every device and every boot, or configuration appears to change
    // on its own.
    const first = makeSpace([AppSpace.SETTINGS_SPACE_TAG], 'BAAAA');
    const second = makeSpace([AppSpace.SETTINGS_SPACE_TAG], 'BZZZZ');
    expect(AppSpace.getSettingsSpace(makeClient([first, second]))?.id).toEqual('BAAAA');
    expect(AppSpace.getSettingsSpace(makeClient([second, first]))?.id).toEqual('BAAAA');
  });

  test('prefers the duplicate carrying the default-space designation', ({ expect }) => {
    // Id order is arbitrary, so the space that has actually been used wins: it is the one holding
    // the ordering and the designation the migration wrote.
    const designated = makeSpace([AppSpace.SETTINGS_SPACE_TAG], 'BZZZZ', { defaultSpaceId: 'BSOME' });
    const empty = makeSpace([AppSpace.SETTINGS_SPACE_TAG], 'BAAAA');
    expect(AppSpace.getSettingsSpace(makeClient([empty, designated]))?.id).toEqual('BZZZZ');
  });
});

/**
 * A stand-in carrying only the fields the tag predicates read. Cast here rather than widening the
 * predicates, so production code sees a real `Space` and the fake stays contained to the test.
 */
const makeSpace = (tags: string[], id = 'BSPACE', { defaultSpaceId }: { defaultSpaceId?: string } = {}): Space =>
  ({
    id,
    tags,
    properties: makeProperties(defaultSpaceId),
    state: { get: () => SpaceState.SPACE_READY },
  }) as unknown as Space;

/** A real entity rather than a plain object, since annotation reads reject anything else. */
const makeProperties = (defaultSpaceId?: string) => {
  const properties = Obj.make(Expando.Expando, {});
  if (defaultSpaceId) {
    Obj.update(properties, (properties) => {
      Annotation.set(properties, AppAnnotation.DefaultSpaceAnnotation, defaultSpaceId);
    });
  }
  return properties;
};

const makeClient = (spaces: Space[]) => ({ spaces: { get: () => spaces } });
