//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';
import { expect } from 'chai';

import { test } from '@dxos/test';

import { EchoObject, EchoSchema } from './schema';

export class Table extends EchoObject.extend<Table>()({
  title: S.string,
  schema: EchoSchema,
  props: S.array(
    S.struct({
      id: S.string,
      prop: S.string,
      label: S.string,
      refProp: S.string,
      size: S.number,
    }),
  ),
}) {}

test('valid properties', () => {
  const table = new Table({
    title: 'Example',
    schema: new EchoSchema({ name: 'Test', version: '1.0.0', schema: '{}' }),
    props: [],
  });
  const t = table.__schema();
  S.validateSync(t)(table);
  expect(table.id).not.to.be.undefined;
});

test('is echo object test', () => {
  const properties = {
    title: 'Example',
    schema: new EchoSchema({ name: 'Test', version: '1.0.0', schema: '{}' }),
    props: [],
  };
  const table = new Table(properties);
  S.validateSync(EchoObject)(table);
  expect(() => S.validateSync(EchoObject)(properties)).to.throw();
});

test('invalid properties', () => {
  expect(
    () =>
      new Table({
        schema: new EchoSchema({ name: 'Test', version: '1.0.0', schema: '{}' }),
        props: [],
      } as any),
  ).to.throw();
});
