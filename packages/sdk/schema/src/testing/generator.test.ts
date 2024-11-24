//
// Copyright 2024 DXOS.org
//

import { describe, test } from 'vitest';

import { createMutableSchema, FormatEnum, type JsonProp, TypeEnum, type ReactiveObject } from '@dxos/echo-schema';

import { Contact, Org } from './generator';
import { ViewProjection } from '../projection';
import { createView, type ViewType } from '../view';

// TODO(burdon): Generate relational tables/views.
// TODO(burdon): Generate test documents, sketches, sheets.

describe('Generator', () => {
  test('types', ({ expect }) => {
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
    expect(orgView.fields).to.have.length(2);

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
    expect(contactView.fields).to.have.length(2);

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

  // TODO(burdon): Test creating org and contact objects with appropriate values automatically from annotations.
});
