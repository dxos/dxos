//
// Copyright 2024 DXOS.org
//

import { AST, Schema as S } from '@effect/schema';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { MutableSchemaRegistry } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import {
  Format,
  FormatEnum,
  ScalarEnum,
  TypedObject,
  createJsonPath,
  createStoredSchema,
  ref,
  toJsonSchema,
} from '@dxos/echo-schema';

import { ViewProjection } from './projection';
import { createView } from './view';

describe('ViewProjection', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('gets and updates projection', async ({ expect }) => {
    const { db } = await builder.createDatabase();
    const registry = new MutableSchemaRegistry(db);

    const schema = createStoredSchema({
      typename: 'example.com/type/Person',
      version: '0.1.0',
      jsonSchema: toJsonSchema(
        S.Struct({
          name: S.String.annotations({ [AST.TitleAnnotationId]: 'Name' }),
          email: Format.Email,
          salary: Format.Currency({ code: 'usd', decimals: 2 }),
        }),
      ),
    });

    const mutable = registry.registerSchema(db.add(schema));

    const view = createView({ typename: schema.typename, jsonSchema: schema.jsonSchema });
    const projection = new ViewProjection(mutable, view);
    expect(view.fields).to.have.length(3);

    {
      const { props } = projection.getFieldProjection('name');
      expect(props).to.deep.eq({
        property: 'name',
        type: ScalarEnum.String,
        format: FormatEnum.None,
        title: 'Name',
      });
    }

    {
      const { props } = projection.getFieldProjection('email');
      expect(props).to.include({
        property: 'email',
        type: ScalarEnum.String,
        format: FormatEnum.Email,
      });
    }

    projection.setFieldProjection({
      field: {
        property: createJsonPath('email'),
        size: 100,
      },
    });

    {
      const { field, props } = projection.getFieldProjection('email');
      expect(field).to.include({
        property: 'email',
        size: 100,
      });
      expect(props).to.include({
        property: 'email',
        type: ScalarEnum.String,
        format: FormatEnum.Email,
      });

      projection.setFieldProjection({ props });
    }

    {
      const { props } = projection.getFieldProjection('salary');
      expect(props).to.include({
        property: 'salary',
        type: ScalarEnum.Number,
        format: FormatEnum.Currency,
        currency: 'USD',
        multipleOf: 2,
      });

      props.currency = 'GBP';
      projection.setFieldProjection({ props });
    }

    {
      const { props } = projection.getFieldProjection('salary');
      expect(props).to.include({
        property: 'salary',
        type: ScalarEnum.Number,
        format: FormatEnum.Currency,
        currency: 'GBP',
        multipleOf: 2,
      });
    }
  });

  test('gets and updates references', async ({ expect }) => {
    const { db } = await builder.createDatabase();
    const registry = new MutableSchemaRegistry(db);

    // TODO(burdon): Reconcile with createStoredSchema.
    class Org extends TypedObject({ typename: 'example.com/type/Org', version: '0.1.0' })({
      name: S.String,
    }) {}

    const schema = createStoredSchema({
      typename: 'example.com/type/Person',
      version: '0.1.0',
      jsonSchema: toJsonSchema(
        S.Struct({
          name: S.String.annotations({ [AST.TitleAnnotationId]: 'Name' }),
          email: Format.Email,
          salary: Format.Currency({ code: 'usd', decimals: 2 }),
          org: ref(Org),
        }),
      ),
    });

    const mutable = registry.registerSchema(db.add(schema));
    const view = createView({ typename: schema.typename, jsonSchema: schema.jsonSchema });
    const projection = new ViewProjection(mutable, view);

    projection.setFieldProjection({
      field: {
        property: createJsonPath('org'),
        referenceProperty: createJsonPath('name'),
      },
    });

    const { field, props } = projection.getFieldProjection('org');
    expect(field).to.deep.eq({
      property: 'org',
      referenceProperty: 'name',
    });
    expect(props).to.deep.eq({
      property: 'org',
      type: ScalarEnum.Ref,
      format: FormatEnum.Ref,
      referenceSchema: 'dxn:type:example.com/type/Org',
    });
  });

  // TODO(burdon): Test switching format.
});
