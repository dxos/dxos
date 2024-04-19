//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { PublicKey } from '@dxos/keys';
import { describe, test } from '@dxos/test';

import { create } from './create';
import { S, DynamicEchoSchema, TypedObject, ref, Expando, DynamicSchemaRegistry } from '../../index';

describe('create', () => {
  test('create should not throw', () => {
    // TODO: Registry needs a db
    const registry = new DynamicSchemaRegistry();

    const object = create(TableType, { title: '', props: [] });

    object.schema = registry.add(
      TypedObject({ typename: `example.com/schema/${PublicKey.random().truncate()}`, version: '0.1.0' })({
        title: S.optional(S.string),
      }),
    );

    expect(() => create(SectionType, { object })).to.not.throw();
  });
});

export class SectionType extends TypedObject({ typename: 'braneframe.Stack.Section', version: '0.1.0' })({
  object: ref(Expando),
}) {}

const TableTypePropSchema = S.partial(
  S.mutable(
    S.struct({
      id: S.string,
      prop: S.string,
      label: S.string,
      ref: S.string,
      refProp: S.string,
      size: S.number,
    }),
  ),
);
export type TableTypeProp = S.Schema.Type<typeof TableTypePropSchema>;

export class TableType extends TypedObject({ typename: 'braneframe.Table', version: '0.1.0' })({
  title: S.string,
  schema: S.optional(ref(DynamicEchoSchema)),
  props: S.mutable(S.array(TableTypePropSchema)),
}) {}
