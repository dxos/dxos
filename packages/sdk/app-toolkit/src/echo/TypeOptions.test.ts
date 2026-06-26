//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { Type } from '@dxos/echo';
import { HiddenAnnotation } from '@dxos/echo/Annotation';
import { DXN } from '@dxos/keys';

import * as TypeOptions from './TypeOptions';

const UserType = Type.makeObject(DXN.make('com.example.type.user', '0.1.0'))(Schema.Struct({ name: Schema.String }));

const HiddenType = Type.makeObject(DXN.make('com.example.type.hidden', '0.1.0'))(
  Schema.Struct({ name: Schema.String }).pipe(HiddenAnnotation.set(true)),
);

const Relation = Type.makeRelation(DXN.make('com.example.type.relation', '0.1.0'))({
  source: UserType,
  target: UserType,
})(Schema.Struct({ role: Schema.String }));

const types = [UserType, HiddenType, Relation];

describe('filterTypeOptions', () => {
  test('includes user types and excludes hidden and relation types by default', ({ expect }) => {
    const result = TypeOptions.filterTypeOptions(types, { location: ['database', 'runtime'], kind: ['user'] });
    expect(result.map((o) => o.typename)).toEqual([Type.getTypename(UserType)]);
  });

  test('includes hidden and relation types when hidden kind is requested', ({ expect }) => {
    const result = TypeOptions.filterTypeOptions(types, { location: ['database', 'runtime'], kind: ['hidden'] });
    expect(result.map((o) => o.typename)).toEqual([Type.getTypename(HiddenType), Type.getTypename(Relation)].sort());
  });

  test('excludes runtime types when only database location is requested', ({ expect }) => {
    // The crafted types are code-shipped (runtime); none are persisted (database) type-kind entities.
    const result = TypeOptions.filterTypeOptions(types, { location: ['database'], kind: ['user'] });
    expect(result).toEqual([]);
  });

  test('returns sorted, de-duplicated typenames', ({ expect }) => {
    const result = TypeOptions.filterTypeOptions([UserType, UserType], { location: ['runtime'], kind: ['user'] });
    expect(result.map((o) => o.typename)).toEqual([Type.getTypename(UserType)]);
  });
});
