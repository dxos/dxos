//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { Annotation, Obj } from '@dxos/echo';
import { Expando } from '@dxos/schema';

import * as AppAnnotation from './AppAnnotation';
import * as AppSpace from './AppSpace';

describe('tags', () => {
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

  test('isSettingsSpace matches the settings tag only', ({ expect }) => {
    expect(AppSpace.isSettingsSpace({ tags: [AppSpace.SETTINGS_SPACE_TAG] } as any)).toBe(true);
    expect(AppSpace.isSettingsSpace({ tags: [AppSpace.PERSONAL_SPACE_TAG] } as any)).toBe(false);
  });

  test('isLegacyPersonalSpace returns true for space with personal tag', ({ expect }) => {
    const space = { tags: [AppSpace.PERSONAL_SPACE_TAG] } as any;
    expect(AppSpace.isLegacyPersonalSpace(space)).toBe(true);
  });

  test('isLegacyPersonalSpace returns false for regular space', ({ expect }) => {
    const space = { tags: [] } as any;
    expect(AppSpace.isLegacyPersonalSpace(space)).toBe(false);
  });
});

describe('personal space resolution', () => {
  test('resolves the space designated by the settings space', ({ expect }) => {
    const personal = makeSpace({ id: 'chosen' });
    const settings = makeSpace({ id: 'settings', tags: [AppSpace.SETTINGS_SPACE_TAG], personalSpaceId: 'chosen' });
    expect(AppSpace.getPersonalSpace(makeClient([settings, personal]))?.id).toBe('chosen');
  });

  test('falls back to the legacy tagged space when no designation exists', ({ expect }) => {
    const legacy = makeSpace({ id: 'legacy', tags: [AppSpace.PERSONAL_SPACE_TAG] });
    const settings = makeSpace({ id: 'settings', tags: [AppSpace.SETTINGS_SPACE_TAG] });
    expect(AppSpace.getPersonalSpace(makeClient([settings, legacy]))?.id).toBe('legacy');
  });

  test('falls back to the legacy tagged space when the designated space is gone', ({ expect }) => {
    const legacy = makeSpace({ id: 'legacy', tags: [AppSpace.PERSONAL_SPACE_TAG] });
    const settings = makeSpace({ id: 'settings', tags: [AppSpace.SETTINGS_SPACE_TAG], personalSpaceId: 'deleted' });
    expect(AppSpace.getPersonalSpace(makeClient([settings, legacy]))?.id).toBe('legacy');
  });

  test('returns undefined when nothing is designated or tagged', ({ expect }) => {
    expect(AppSpace.getPersonalSpace(makeClient([makeSpace({ id: 'plain' })]))).toBeUndefined();
  });

  test('never returns the settings space, even when designated as personal', ({ expect }) => {
    const settings = makeSpace({ id: 'settings', tags: [AppSpace.SETTINGS_SPACE_TAG], personalSpaceId: 'settings' });
    expect(AppSpace.getPersonalSpace(makeClient([settings]))).toBeUndefined();
  });

  test('falls back past a settings-space designation to the legacy space', ({ expect }) => {
    const legacy = makeSpace({ id: 'legacy', tags: [AppSpace.PERSONAL_SPACE_TAG] });
    const settings = makeSpace({ id: 'settings', tags: [AppSpace.SETTINGS_SPACE_TAG], personalSpaceId: 'settings' });
    expect(AppSpace.getPersonalSpace(makeClient([settings, legacy]))?.id).toBe('legacy');
  });

  test('setPersonalSpaceId writes a designation that getPersonalSpace reads back', ({ expect }) => {
    const personal = makeSpace({ id: 'chosen' });
    const settings = makeSpace({ id: 'settings', tags: [AppSpace.SETTINGS_SPACE_TAG] });
    AppSpace.setPersonalSpaceId(settings, personal.id);
    expect(AppSpace.readPersonalSpaceId(settings)).toBe('chosen');
    expect(AppSpace.getPersonalSpace(makeClient([settings, personal]))?.id).toBe('chosen');
  });
});

/** Minimal space stand-in: `getPersonalSpace` only reads `tags`, `properties` and `id`. */
const makeSpace = ({
  id = 'space',
  tags = [] as string[],
  personalSpaceId,
}: {
  id?: string;
  tags?: string[];
  personalSpaceId?: string;
}) => {
  const properties = Obj.make(Expando.Expando, {});
  if (personalSpaceId) {
    Obj.update(properties, (properties) => {
      Annotation.set(properties, AppAnnotation.PersonalSpaceAnnotation, personalSpaceId);
    });
  }
  return { id, tags, properties } as any;
};

const makeClient = (spaces: any[]) => ({
  spaces: {
    get: (id?: string) => (id === undefined ? spaces : spaces.find((space) => space.id === id)),
  },
});
