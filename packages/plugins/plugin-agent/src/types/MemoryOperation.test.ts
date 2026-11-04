//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Type } from '@dxos/echo';
import { Organization, Person } from '@dxos/types';

import * as MemoryOperation from './MemoryOperation.ts';

// On EDGE a bundle registers only its own plugin's types; an operation declares the others it writes (EDGE-PLUGINS
// F-3.4), or `Database.add` fails with "Schema not registered".
describe('MemoryOperation', () => {
  test('resolveEntity declares the types it creates', ({ expect }) => {
    const declared = (MemoryOperation.ResolveEntity.types ?? []).map((type) => Type.getTypename(type));
    expect(declared).toEqual(
      expect.arrayContaining([Type.getTypename(Person.Person), Type.getTypename(Organization.Organization)]),
    );
  });
});
