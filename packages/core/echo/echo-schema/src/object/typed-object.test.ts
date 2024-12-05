//
// Copyright 2024 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { AST, S } from '@dxos/effect';

import { TypedObject } from './typed-object';

class OrganizationType extends TypedObject({
  typename: 'example.com/type/Organization',
  version: '0.1.0',
})({
  name: S.String,
}) {}

describe('EchoObject class DSL', () => {
  test('type is a valid schema', async () => {
    expect(S.isSchema(OrganizationType)).to.be.true;
  });

  test('static typename accessor', async () => {
    expect(OrganizationType.typename).to.eq('example.com/type/Organization');
  });

  test('expect constructor to throw', async () => {
    expect(() => new OrganizationType()).to.throw();
  });

  test('expect schema', async () => {
    console.log(AST.isTypeLiteral(OrganizationType.ast));
  });
});
