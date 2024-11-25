//
// Copyright 2024 DXOS.org
//

import { Effect, pipe } from 'effect';
import { describe, test } from 'vitest';

import { Filter } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import {
  createMutableSchema,
  FormatEnum,
  type JsonProp,
  TypeEnum,
  type ReactiveObject,
  type AbstractTypedObject,
} from '@dxos/echo-schema';
import { log } from '@dxos/log';

import { createArrayPipeline } from './generator';
import { Contact, ContactType, Org, OrgType, ProjectType } from './types';
import { ViewProjection } from '../projection';
import { createView, type ViewType } from '../view';

describe('Generator', () => {
  // TODO(burdon): Move to @dxos/effect.
  test('effect sanity', async ({ expect }) => {
    {
      const result = pipe(
        10,
        (value) => value + 3,
        (value) => value * 2,
      );
      expect(result).to.eq(26);
    }

    {
      const result = await Effect.runPromise(
        pipe(
          Effect.promise(() => Promise.resolve(10)),
          Effect.tap((value) => log.info('tap', { value })),
          Effect.map((value) => value + 3),
          Effect.tap((value) => log.info('tap', { value })),
          Effect.map((value) => value * 2),
          Effect.tap((value) => log.info('tap', { value })),
        ),
      );
      expect(result).to.eq(26);
    }

    {
      const result = await Effect.runPromise(
        pipe(
          Effect.succeed(100),
          Effect.tap((value) => log.info('tap', { value })),
          Effect.map((value: number) => String(value)),
          Effect.tap((value) => log.info('tap', { value })),
          Effect.map((value: string) => value.length),
          Effect.tap((value) => log.info('tap', { value })),
        ),
      );
      expect(result).to.eq(3);
    }

    {
      const result = await Effect.runPromise(
        pipe(
          Effect.succeed(100),
          Effect.flatMap((value) => Effect.succeed(String(value))),
          Effect.map((value) => value.length),
        ),
      );
      expect(result).to.eq(3);
    }
  });

  test('generate objects', async ({ expect }) => {
    const builder = new EchoTestBuilder();
    const { db } = await builder.createDatabase();
    db.graph.schemaRegistry.addSchema([OrgType, ProjectType, ContactType]);

    type Spec = { type: AbstractTypedObject; count: number };
    const spec: Spec[] = [
      { type: OrgType, count: 1 },
      { type: ProjectType, count: 1 },
      { type: ContactType, count: 1 },
    ];

    for (const { type, count } of spec) {
      // const o = createObjectPipeline(type, db);
      const objects = await Effect.runPromise(createArrayPipeline(count));
      expect(objects).to.have.length(count);
      await db.flush();
    }

    const result = await db.query(Filter.schema(ContactType)).run();
    console.log(JSON.stringify(result.objects, null, 2));

    // TODO(burdon): Create tables and views.
    // TODO(burdon): Convert to Tree.
    // stringifyTree();
  });

  // TODO(burdon): Factor out creating relation.
  test('types', ({ expect }) => {
    // Org.
    const orgSchema = createMutableSchema(
      {
        typename: 'example.com/type/Org',
        version: '0.1.0',
      },
      Org.fields,
    );

    // Contact.
    const contactSchema = createMutableSchema(
      {
        typename: 'example.com/type/Contact',
        version: '0.1.0',
      },
      Contact.fields,
    );

    const contactView: ReactiveObject<ViewType> = createView({
      name: 'Contacts',
      typename: contactSchema.typename,
      jsonSchema: contactSchema.jsonSchema,
    });

    // Add relation field.
    const contactProjection = new ViewProjection(contactSchema, contactView);

    {
      const field = contactProjection.createFieldProjection();
      expect(contactView.fields).to.have.length(3);

      // TODO(burdon): Test set before create field.
      contactProjection.setFieldProjection({
        field,
        props: {
          property: 'employer' as JsonProp,
          type: TypeEnum.Ref,
          format: FormatEnum.Ref,
          referenceSchema: orgSchema.typename,
          referencePath: 'name',
        },
      });
    }

    {
      const { props } = contactProjection.getFieldProjection(contactProjection.getFieldId('employer')!);
      expect(props.type).to.eq(TypeEnum.Ref);
      expect(props.format).to.eq(FormatEnum.Ref);
    }
  });
});
