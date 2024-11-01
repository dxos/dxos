//
// Copyright 2024 DXOS.org
//

import { describe, test, beforeEach, afterEach } from 'vitest';

import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { TypedObject, toJsonSchema } from '@dxos/echo-schema';

import { type ViewType } from './view';

describe('view', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('adds property to schema', async ({ expect }) => {
    const { db } = await builder.createDatabase();
    class TestSchema extends TypedObject({ typename: 'example.com/type/Test', version: '0.1.0' })({}) {}
    const schema = db.schema.addSchema(TestSchema);
    const view: ViewType = {
      schema: toJsonSchema(TestSchema),
      query: {
        __typename: schema.typename,
      },
      fields: [],
    };

    expect(view.query.__typename).to.eq(TestSchema.typename);
  });
});
