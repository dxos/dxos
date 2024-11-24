//
// Copyright 2024 DXOS.org
//

import { describe, test } from 'vitest';

import { Filter } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { createMutableSchema, FormatEnum, type JsonProp, TypeEnum, type ReactiveObject } from '@dxos/echo-schema';

import { Contact, ContactType, Org, OrgType, ProjectType } from './types';
import { createObjects } from './util';
import { ViewProjection } from '../projection';
import { createView, type ViewType } from '../view';

describe('Generator', () => {
  test('generate objects', async ({ expect }) => {
    const builder = new EchoTestBuilder();
    const { db } = await builder.createDatabase();
    db.graph.schemaRegistry.addSchema([OrgType, ProjectType, ContactType]);

    await createObjects(db, OrgType, 5);
    await createObjects(db, ProjectType, 5);
    await createObjects(db, ContactType, 5);
    await db.flush();

    const result = await db.query(Filter.schema(OrgType)).run();
    expect(result.objects).to.have.length(5);

    // TODO(burdon): Create tables and views.
  });

  test('types', ({ expect }) => {
    // Org.
    const orgSchema = createMutableSchema(
      {
        typename: 'example.com/type/Org',
        version: '0.1.0',
      },
      Org.fields,
    );

    const orgView: ReactiveObject<ViewType> = createView({
      name: 'Orgs',
      typename: orgSchema.typename,
      jsonSchema: orgSchema.jsonSchema,
    });

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
