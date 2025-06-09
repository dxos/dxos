//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import { Schema, SchemaAST } from 'effect';
import React, { useCallback, useState } from 'react';

import { ContactType } from '@dxos/client/testing';
import { type BaseObject, Expando, Format, getDXN, Ref, type TypeAnnotation } from '@dxos/echo-schema';
import { live } from '@dxos/live-object';
import { Testing } from '@dxos/schema/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { SelectInput } from './Defaults';
import { Form, type FormProps } from './Form';
import translations from '../../translations';
import { TestLayout, TestPanel } from '../testing';

const AddressSchema = Schema.Struct({
  street: Schema.optional(Schema.String.annotations({ [SchemaAST.TitleAnnotationId]: 'Street' })),
  city: Schema.optional(Schema.String.annotations({ [SchemaAST.TitleAnnotationId]: 'City' })),
  zip: Schema.optional(
    Schema.String.pipe(Schema.pattern(/^\d{5}(-\d{4})?$/)).annotations({ [SchemaAST.TitleAnnotationId]: 'ZIP' }),
  ),
  location: Schema.optional(Format.GeoPoint.annotations({ [SchemaAST.TitleAnnotationId]: 'Location' })),
}).annotations({ [SchemaAST.TitleAnnotationId]: 'Address' });

// TODO(burdon): Translations?
const TestSchema = Schema.Struct({
  name: Schema.optional(Schema.String.annotations({ [SchemaAST.TitleAnnotationId]: 'Name' })),
  active: Schema.optional(Schema.Boolean.annotations({ [SchemaAST.TitleAnnotationId]: 'Active' })),
  rank: Schema.optional(Schema.Number.annotations({ [SchemaAST.TitleAnnotationId]: 'Rank' })),
  website: Schema.optional(Format.URL.annotations({ [SchemaAST.TitleAnnotationId]: 'Website' })),
  address: Schema.optional(AddressSchema),
}).pipe(Schema.mutable);

type TestType = Schema.Schema.Type<typeof TestSchema>;

type StoryProps<T extends BaseObject> = { schema: Schema.Schema<T> } & FormProps<T>;

const DefaultStory = <T extends BaseObject>({ schema, values: initialValues, ...props }: StoryProps<T>) => {
  const [values, setValues] = useState(initialValues);
  const handleSave = useCallback<NonNullable<FormProps<T>['onSave']>>((values) => {
    setValues(values);
  }, []);

  return (
    <TestLayout json={{ values, schema: schema.ast.toJSON() }}>
      <TestPanel>
        <Form<T> schema={schema} values={values} onSave={handleSave} {...props} />
      </TestPanel>
    </TestLayout>
  );
};

const meta: Meta<StoryProps<any>> = {
  title: 'ui/react-ui-form/Form',
  component: Form,
  render: DefaultStory,
  decorators: [withLayout({ fullscreen: true }), withTheme],
  parameters: {
    translations,
  },
};

export default meta;

type Story<T extends BaseObject> = StoryObj<StoryProps<T>>;

export const Default: Story<TestType> = {
  args: {
    schema: TestSchema,
    values: {
      name: 'DXOS',
      active: true,
      address: {
        zip: '11205',
      },
    },
  },
};

export const Readonly: Story<TestType> = {
  args: {
    schema: TestSchema,
    values: {
      name: 'DXOS',
      active: true,
      address: {
        zip: '11205',
      },
    },
    readonly: true,
  },
};

export const Organization: Story<Testing.Organization> = {
  args: {
    schema: Testing.OrganizationSchema,
    values: {
      name: 'DXOS',
      // website: 'https://dxos.org',
    },
  },
};

export const OrganizationAutoSave: Story<Testing.Organization> = {
  args: {
    schema: Testing.OrganizationSchema,
    values: {
      name: 'DXOS',
      // website: 'https://dxos.org',
    },
    autoSave: true,
  },
};

// TODO(burdon): Type issue with employer reference.
// TODO(burdon): Test table/form with compound values (e.g., address).
// export const Contact: Story<Testing.ContactSchemaType> = {
//   args: {
//     // Property name is missing in type EncodedReference but required in type
//     schema: Testing.ContactSchema,
//     values: {
//       name: 'Bot',
//     },
//   },
// };

//
// TODO(burdon): Move into separate storybook and use test types.
//

const ShapeSchema = Schema.Struct({
  shape: Schema.optional(
    Schema.Union(
      Schema.Struct({
        type: Schema.Literal('circle').annotations({ [SchemaAST.TitleAnnotationId]: 'Type' }),
        radius: Schema.optional(Schema.Number.annotations({ [SchemaAST.TitleAnnotationId]: 'Radius' })),
      }),
      Schema.Struct({
        type: Schema.Literal('square').annotations({ [SchemaAST.TitleAnnotationId]: 'Type' }),
        size: Schema.optional(
          Schema.Number.pipe(Schema.nonNegative()).annotations({ [SchemaAST.TitleAnnotationId]: 'Size' }),
        ),
      }),
    ).annotations({ [SchemaAST.TitleAnnotationId]: 'Shape' }),
  ),
}).pipe(Schema.mutable);

type ShapeType = Schema.Schema.Type<typeof ShapeSchema>;

type DiscriminatedUnionStoryProps = FormProps<ShapeType>;

const DiscriminatedUnionStory = ({ values: initialValues }: DiscriminatedUnionStoryProps) => {
  const [values, setValues] = useState(initialValues);
  const handleSave = useCallback<NonNullable<FormProps<ShapeType>['onSave']>>((values) => {
    setValues(values);
  }, []);

  return (
    <TestLayout json={{ values, schema: ShapeSchema.ast.toJSON() }}>
      <TestPanel>
        <Form<ShapeType>
          schema={ShapeSchema}
          values={values}
          onSave={handleSave}
          Custom={{
            ['shape.type' as const]: (props) => (
              <SelectInput
                {...props}
                options={['circle', 'square'].map((value) => ({
                  value,
                  label: value,
                }))}
              />
            ),
          }}
        />
      </TestPanel>
    </TestLayout>
  );
};

export const DiscriminatedShape: StoryObj<DiscriminatedUnionStoryProps> = {
  render: DiscriminatedUnionStory,
  args: {
    values: {
      shape: {
        type: 'circle',
        radius: 5,
      },
    },
  },
};

const ArraysSchema = Schema.Struct({
  names: Schema.Array(Schema.String.pipe(Schema.nonEmptyString())),
  addresses: Schema.Array(AddressSchema),
}).pipe(Schema.mutable);

type ArraysType = Schema.Schema.Type<typeof ArraysSchema>;

const ArraysStory = ({ values: initialValues }: FormProps<ArraysType>) => {
  const [values, setValues] = useState(initialValues);
  const handleSave = useCallback<NonNullable<FormProps<ArraysType>['onSave']>>((values) => {
    setValues(values);
  }, []);

  return (
    <TestLayout json={{ values, schema: ArraysSchema.ast.toJSON() }}>
      <TestPanel>
        <Form<ArraysType> schema={ArraysSchema} values={values} onSave={handleSave} />
      </TestPanel>
    </TestLayout>
  );
};

export const Arrays: StoryObj<FormProps<ArraysType>> = {
  render: ArraysStory,
  args: {
    values: {
      names: ['Alice', 'Bob'],
      addresses: [],
    },
  },
};

const ColorSchema = Schema.Struct({
  color: Schema.Union(Schema.Literal('red'), Schema.Literal('green'), Schema.Literal('blue')).annotations({
    [SchemaAST.TitleAnnotationId]: 'Color',
  }),
}).pipe(Schema.mutable);

type ColorType = Schema.Schema.Type<typeof ColorSchema>;

const EnumStory = ({ values: initialValues }: FormProps<ColorType>) => {
  const [values, setValues] = useState(initialValues);
  const handleSave = useCallback<NonNullable<FormProps<ColorType>['onSave']>>((values) => {
    setValues(values);
  }, []);

  return (
    <TestLayout json={{ values, schema: ColorSchema.ast.toJSON() }}>
      <TestPanel>
        <Form<ColorType> schema={ColorSchema} values={values} onSave={handleSave} />
      </TestPanel>
    </TestLayout>
  );
};

export const Enum: StoryObj<FormProps<ColorType>> = {
  render: EnumStory,
  args: {
    values: {
      color: 'red',
    },
  },
};

const RefSchema = Schema.Struct({
  contact: Ref(ContactType).annotations({ title: 'Contact Reference' }),
  optionalContact: Schema.optional(Ref(ContactType).annotations({ title: 'Optional Contact Reference' })),
  refArray: Schema.optional(Schema.Array(Ref(ContactType))),
  unknownExpando: Schema.optional(Ref(Expando).annotations({ title: 'Optional Ref to an Expando (DXN Input)' })),
});

const contact1 = live(ContactType, { identifiers: [] });
const contact2 = live(ContactType, { identifiers: [] });

const RefStory = ({ values: initialValues }: FormProps<any>) => {
  const [values, setValues] = useState(initialValues);
  const handleSave = useCallback<NonNullable<FormProps<any>['onSave']>>((values) => {
    setValues(values);
  }, []);

  const onQueryRefOptions = useCallback((typeInfo: TypeAnnotation) => {
    switch (typeInfo.typename) {
      case ContactType.typename:
        return [
          { dxn: getDXN(contact1)!, label: 'John Coltraine' },
          { dxn: getDXN(contact2)!, label: 'Erykah Badu' },
        ];
      default:
        return [];
    }
  }, []);

  return (
    <TestLayout json={{ values, schema: RefSchema.ast.toJSON() }}>
      <TestPanel>
        <Form schema={RefSchema} values={values} onSave={handleSave} onQueryRefOptions={onQueryRefOptions} />
      </TestPanel>
    </TestLayout>
  );
};

export const Refs: StoryObj<FormProps<ContactType>> = {
  render: RefStory,
  args: { values: { refArray: [Ref.make(contact1), Ref.make(contact2)] } as any },
};
