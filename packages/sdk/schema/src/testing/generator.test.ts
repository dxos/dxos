//
// Copyright 2024 DXOS.org
//

import { Effect } from 'effect';
import { describe, test } from 'vitest';

import { Filter } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import {
  createMutableSchema,
  getSchemaTypename,
  FormatEnum,
  type JsonProp,
  TypeEnum,
  type ReactiveObject,
  type S,
  type JsonPath,
} from '@dxos/echo-schema';
import { log } from '@dxos/log';

import { createArrayPipeline, createObjectPipeline } from './generator';
import { Contact, ContactType, createReferenceProperty, Org, OrgType, ProjectType } from './types';
import { ViewProjection } from '../projection';
import { createView, type ViewType } from '../view';

type TypeSpec = {
  type: S.Schema<any>;
  count: number;
};

describe('Generator', () => {
  test('generate objects', async ({ expect }) => {
    const builder = new EchoTestBuilder();
    const { db } = await builder.createDatabase();
    db.graph.schemaRegistry.addSchema([OrgType, ProjectType, ContactType]);

    const spec: TypeSpec[] = [
      { type: OrgType, count: 1 },
      { type: ProjectType, count: 1 },
      { type: ContactType, count: 3 },
    ];

    for (const { type, count } of spec) {
      const pipeline = createObjectPipeline(type, db);
      const objects = await Effect.runPromise(createArrayPipeline(count, pipeline));
      expect(objects).to.have.length(count);
      await db.flush();
    }
  });

  test.only('generate objects with references', async ({ expect }) => {
    const builder = new EchoTestBuilder();
    const { db } = await builder.createDatabase();

    const org = db.schemaRegistry.addSchema(OrgType);
    const contact = createReferenceProperty(
      db.schemaRegistry.addSchema(ContactType),
      'employer' as JsonProp,
      org.typename,
      'name' as JsonPath,
    );

    const spec: TypeSpec[] = [
      { type: org, count: 5 },
      { type: contact, count: 10 },
    ];

    for (const { type, count } of spec) {
      const pipeline = createObjectPipeline(type, db);
      const objects = await Effect.runPromise(createArrayPipeline(count, pipeline));
      expect(objects).to.have.length(count);
      await db.flush();
      log.info('created', { type: getSchemaTypename(type), count });
    }

    // TODO(burdon): Test SOME contacts have employer.
    const result = await db.query(Filter.schema(contact)).run();
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
