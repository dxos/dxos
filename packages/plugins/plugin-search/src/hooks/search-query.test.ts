//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { DXN, Obj, Type } from '@dxos/echo';
import { TestSchema } from '@dxos/schema/testing';

import { toSearchResults } from './search-query.ts';

/** A type declaring no `IconAnnotation`, to exercise the fallback. */
const Unadorned = Type.makeObject(DXN.make('com.example.type.unadorned', '0.1.0'))(
  Schema.Struct({ name: Schema.String }),
);

describe('search-query', () => {
  test('toSearchResults takes each row icon from the type annotation', ({ expect }) => {
    // A row renders an empty icon box unless the icon is a real sprite id.
    const org = Obj.make(TestSchema.Organization, { name: 'Bramble Coffee Roasters' });
    const [result] = toSearchResults([org], 'bramble');
    expect(result.icon).toBe('ph--building--regular');
  });

  test('toSearchResults falls back to a default icon so every row has one', ({ expect }) => {
    const object = Obj.make(Unadorned, { name: 'Roast locked' });
    const [result] = toSearchResults([object], 'roast');
    expect(result.icon).toBe('ph--circle-dashed--regular');
  });
});
