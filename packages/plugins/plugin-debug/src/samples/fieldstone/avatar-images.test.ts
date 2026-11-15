//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { AVATAR_IMAGES } from './avatar-images.ts';
import { CONTACT_SEEDS } from './inbox-crm/contacts.ts';
import { PEOPLE_SEEDS } from './team/people.ts';

describe('avatar images', () => {
  // A headshot keyed by a misspelled name would silently go unused.
  test('every headshot belongs to a seeded person', ({ expect }) => {
    const names = new Set<string>([...PEOPLE_SEEDS, ...CONTACT_SEEDS].map((seed) => seed.fullName));
    expect(Object.keys(AVATAR_IMAGES).filter((name) => !names.has(name))).toEqual([]);
    // And every person has one.
    expect([...names].filter((name) => !AVATAR_IMAGES[name])).toEqual([]);
  });
});
