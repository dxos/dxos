//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { Schema } from 'effect';
import React, { useCallback, useState } from 'react';

import { ContactType } from '@dxos/client/testing';
import { type BaseObject, Expando, Format, Ref, type TypeAnnotation, getObjectDXN } from '@dxos/echo/internal';
import { live } from '@dxos/live-object';
import { withSurfaceVariantsLayout } from '@dxos/react-ui/testing';
import { Testing } from '@dxos/schema/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { translations } from '../../translations';
import { TestLayout, TestPanel } from '../testing';

import { SelectInput } from './Defaults';
import { Form, type FormProps } from './Form';

const AddressSchema = Schema.Struct({
  street: Schema.optional(Schema.String.annotations({ title: 'Street' })),
  city: Schema.optional(Schema.String.annotations({ title: 'City' })),
  zip: Schema.optional(Schema.String.pipe(Schema.pattern(/^\d{5}(-\d{4})?$/)).annotations({ title: 'ZIP' })),
  location: Schema.optional(Format.GeoPoint.annotations({ title: 'Location' })),
}).annotations({ title: 'Address' });

// TODO(burdon): Translations?
const TestSchema = Schema.Struct({
  name: Schema.optional(Schema.String.annotations({ title: 'Name' })),
  active: Schema.optional(Schema.Boolean.annotations({ title: 'Active' })),
  rank: Schema.optional(Schema.Number.annotations({ title: 'Rank' })),
  website: Schema.optional(Format.URL.annotations({ title: 'Website' })),
  address: Schema.optional(AddressSchema),
}).pipe(Schema.mutable);

type TestType = Schema.Schema.Type<typeof TestSchema>;

type StoryProps<T extends BaseObject> = { schema: Schema.Schema<T> } & FormProps<T>;

const DefaultStory = <T extends BaseObject>({ schema, values: initialValues, ...props }: StoryProps<T>) => {
  const [values, setValues] = useState(initialValues);
  const handleSave = useCallback<NonNullable<FormProps<T>['onSave']>>((values) => {
    setValues(values);
  }, []);

  return <Form<T> schema={schema} values={values} onSave={handleSave} {...props} />;
};

const DebugStory = <T extends BaseObject>({ schema, values: initialValues, ...props }: StoryProps<T>) => {
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
  component: Form<any>,
  render: DebugStory,
  decorators: [withLayout({ fullscreen: true }), withTheme],
  parameters: {
    translations,
  },
  argTypes: {
    readonly: {
      control: 'boolean',
      description: 'Readonly',
    },
  },
};

export default meta;

type Story<T extends BaseObject> = StoryObj<StoryProps<T>>;

export const Default: Story<TestType> = {
  render: DefaultStory,
  decorators: [withSurfaceVariantsLayout(), withTheme],
  args: {
    schema: TestSchema,
    values: {
      name: 'DXOS',
      active: true,
      address: {
        zip: '11205',
      },
    },
    readonly: false,
  },
};

export const Organization: Story<Schema.Schema.Type<typeof Testing.OrganizationSchema>> = {
  args: {
    schema: Testing.OrganizationSchema,
    values: {
      name: 'DXOS',
      website: 'https://dxos.org',
    },
    readonly: false,
  },
};

export const OrganizationAutoSave: Story<Schema.Schema.Type<typeof Testing.OrganizationSchema>> = {
  args: {
    schema: Testing.OrganizationSchema,
    values: {
      name: 'DXOS',
      website: 'https://dxos.org',
    },
    autoSave: true,
    readonly: false,
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

const ShapeSchema = Schema.Struct({
  shape: Schema.optional(
    Schema.Union(
      Schema.Struct({
        type: Schema.Literal('circle').annotations({ title: 'Type' }),
        radius: Schema.optional(Schema.Number.annotations({ title: 'Radius' })),
      }),
      Schema.Struct({
        type: Schema.Literal('square').annotations({ title: 'Type' }),
        size: Schema.optional(Schema.Number.pipe(Schema.nonNegative()).annotations({ title: 'Size' })),
      }),
    ).annotations({ title: 'Shape' }),
  ),
}).pipe(Schema.mutable);

type ShapeType = Schema.Schema.Type<typeof ShapeSchema>;

export const DiscriminatedShape: Story<ShapeType> = {
  args: {
    schema: ShapeSchema,
    readonly: false,
    values: {
      shape: {
        type: 'circle',
        radius: 5,
      },
    },
    Custom: {
      ['shape.type' as const]: (props) => (
        <SelectInput
          {...props}
          options={['circle', 'square'].map((value) => ({
            value,
            label: value,
          }))}
        />
      ),
    },
  },
};

const ArraysSchema = Schema.Struct({
  names: Schema.Array(Schema.String.pipe(Schema.nonEmptyString())),
  addresses: Schema.Array(AddressSchema),
}).pipe(Schema.mutable);

type ArraysType = Schema.Schema.Type<typeof ArraysSchema>;

export const Arrays: StoryObj<FormProps<ArraysType>> = {
  args: {
    schema: ArraysSchema,
    readonly: false,
    values: {
      names: ['Alice', 'Bob'],
      addresses: [],
    },
  },
};

const ColorSchema = Schema.Struct({
  color: Schema.Union(Schema.Literal('red'), Schema.Literal('green'), Schema.Literal('blue')).annotations({
    title: 'Color',
  }),
}).pipe(Schema.mutable);

type ColorType = Schema.Schema.Type<typeof ColorSchema>;

export const Enum: StoryObj<FormProps<ColorType>> = {
  args: {
    schema: ColorSchema,
    readonly: false,
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

const RefStory = ({ values: initialValues, readonly }: FormProps<any>) => {
  const [values, setValues] = useState(initialValues);
  const handleSave = useCallback<NonNullable<FormProps<any>['onSave']>>((values) => {
    setValues(values);
  }, []);

  const onQueryRefOptions = useCallback((typeInfo: TypeAnnotation) => {
    switch (typeInfo.typename) {
      case ContactType.typename:
        return [
          { dxn: getObjectDXN(contact1)!, label: 'John Coltraine' },
          { dxn: getObjectDXN(contact2)!, label: 'Erykah Badu' },
        ];
      default:
        return [];
    }
  }, []);

  return (
    <TestLayout json={{ values, schema: RefSchema.ast.toJSON() }}>
      <TestPanel>
        <Form
          schema={RefSchema}
          values={values}
          readonly={readonly}
          onSave={handleSave}
          onQueryRefOptions={onQueryRefOptions}
        />
      </TestPanel>
    </TestLayout>
  );
};

export const Refs: StoryObj<FormProps<ContactType>> = {
  render: RefStory,
  args: {
    readonly: false,
    values: {
      refArray: [Ref.make(contact1), Ref.make(contact2)],
    } as any,
  },
};
