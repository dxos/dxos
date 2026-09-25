//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { Annotation, Obj, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';

import * as TypeOptions from './TypeOptions.ts';

const UserType = Type.makeObject(DXN.make('com.example.type.user', '0.1.0'))(
  Schema.Struct({ name: Schema.String }).pipe(Annotation.UserType.set()),
);

const HiddenType = Type.makeObject(DXN.make('com.example.type.hidden', '0.1.0'))(
  Schema.Struct({ name: Schema.String }),
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

  test('runtime types carry no data label so the consumer falls back to the typename translation', ({ expect }) => {
    // Static types are JS class constructors with no user-set `name` field. The label must be
    // `undefined` (not the constructor's intrinsic `.name`, which production minifiers mangle) so
    // `useTypeOptions` resolves the proper label via `t('typename.label', { ns: typename })`.
    const [option] = TypeOptions.filterTypeOptions([UserType], { location: ['runtime'], kind: ['user'] });
    expect(option.label).toBeUndefined();
  });
});

describe('isUserType', () => {
  test('a static type is user-facing only when annotated', ({ expect }) => {
    expect(TypeOptions.isUserType(UserType)).toBe(true);
    expect(TypeOptions.isUserType(HiddenType)).toBe(false);
    expect(TypeOptions.isUserType(HiddenType, { includeHidden: true })).toBe(true);
  });

  test('a tag is only on the types annotated with it', ({ expect }) => {
    const Tagged = Type.makeObject(DXN.make('com.example.type.tagged', '0.1.0'))(
      Schema.Struct({ name: Schema.String }).pipe(Annotation.UserType.set({ tags: ['com.example.tag'] })),
    );
    expect(TypeOptions.hasUserTypeTag(Tagged, 'com.example.tag')).toBe(true);
    expect(TypeOptions.hasUserTypeTag(UserType, 'com.example.tag')).toBe(false);
  });

  test('an object is user-facing when its type is', ({ expect }) => {
    expect(TypeOptions.isUserObject(Obj.make(UserType, { name: 'a' }))).toBe(true);
    expect(TypeOptions.isUserObject(Obj.make(HiddenType, { name: 'b' }))).toBe(false);
  });

  test('a relation is never user-facing', ({ expect }) => {
    expect(TypeOptions.isUserType(Relation, { includeHidden: true })).toBe(false);
  });
});
