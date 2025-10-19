//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import { describe, expect, test } from 'vitest';

import { TypedObject } from './typed-object';

class Organization extends TypedObject({
  typename: 'example.com/type/Organization',
  version: '0.1.0',
})({
  name: Schema.String,
}) {}

describe('EchoObject class DSL', () => {
  test('type is a valid schema', async () => {
    expect(Schema.isSchema(Organization)).to.be.true;
  });

  test('static typename accessor', async () => {
    expect(Organization.typename).to.eq('example.com/type/Organization');
  });

  test('expect constructor to throw', async () => {
    expect(() => new Organization()).to.throw();
  });

  test('expect schema', async () => {
    expect(SchemaAST.isTypeLiteral(Organization.ast)).to.be.true;
  });
});
