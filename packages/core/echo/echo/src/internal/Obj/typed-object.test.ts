//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import { describe, expect, test } from 'vitest';

import { DXN } from '@dxos/keys';

import * as Type from '../../Type';
import { EchoObjectSchema } from '../Entity';

const Organization = Schema.Struct({
  name: Schema.String,
}).pipe(EchoObjectSchema(DXN.make('com.example.type.organization', '0.1.0')));

type Organization = Type.InstanceType<typeof Organization>;

describe('EchoObjectSchema DSL', () => {
  test('type is a Type.Type entity', async () => {
    expect(Schema.isSchema(Type.getSchema(Organization))).to.be.true;
  });

  test('static typename accessor', async () => {
    expect(Type.getTypename(Organization)).to.eq('com.example.type.organization');
  });

  test('expect schema', async () => {
    expect(SchemaAST.isTypeLiteral(Type.getSchema(Organization).ast)).to.be.true;
  });
});
