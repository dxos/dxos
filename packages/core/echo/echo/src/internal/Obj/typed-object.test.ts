//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import { describe, expect, test } from 'vitest';

import { EchoObjectSchema } from '../Entity';

const Organization = Schema.Struct({
  name: Schema.String,
}).pipe(
  EchoObjectSchema({
    typename: 'com.example.type.organization',
    version: '0.1.0',
  }),
);

interface Organization extends Schema.Schema.Type<typeof Organization> {}

describe('EchoObjectSchema DSL', () => {
  test('type is a valid schema', async () => {
    expect(Schema.isSchema(Organization)).to.be.true;
  });

  test('static typename accessor', async () => {
    expect(Organization.typename).to.eq('com.example.type.organization');
  });

  test('expect schema', async () => {
    expect(SchemaAST.isTypeLiteral(Organization.ast)).to.be.true;
  });
});
