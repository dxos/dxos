//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React, { useCallback, useState } from 'react';

import { ContactType } from '@dxos/client/testing';
import { type Type } from '@dxos/echo';
import { type BaseObject, Expando, Format, Ref, type TypeAnnotation, getObjectDXN } from '@dxos/echo/internal';
import { live } from '@dxos/echo/internal';
import { Tooltip } from '@dxos/react-ui';
import { withSurfaceVariantsLayout, withTheme } from '@dxos/react-ui/testing';
import { Testing } from '@dxos/schema/testing';

import { translations } from '../../translations';
import { TestLayout, TestPanel } from '../testing';

import { SelectInput } from './Defaults';
import { Form, type FormProps } from './Form';

type StoryProps<T extends BaseObject> = {
  debug?: boolean;
  schema: Type.Obj.Any;
} & FormProps<T>;

const DefaultStory = <T extends BaseObject = any>({
  debug,
  schema,
  values: initialValues,
  ...props
}: StoryProps<T>) => {
  const [values, setValues] = useState(initialValues);
  const handleSave = useCallback<NonNullable<FormProps<T>['onSave']>>((values) => {
    setValues(values);
  }, []);

  if (debug) {
    return (
      <Tooltip.Provider>
        <TestLayout json={{ values, schema: schema.ast }}>
          <TestPanel>
            <Form<T> schema={schema} values={values} onSave={handleSave} {...props} />
          </TestPanel>
        </TestLayout>
      </Tooltip.Provider>
    );
  }

  return <Form<T> schema={schema} values={values} onSave={handleSave} {...props} />;
};

const RefStory = <T extends BaseObject = any>(props: StoryProps<T>) => {
  const onQueryRefOptions = useCallback((typeInfo: TypeAnnotation) => {
    switch (typeInfo.typename) {
      case Testing.Person.typename:
        return [
          { dxn: getObjectDXN(contact1)!, label: 'John Coltraine' },
          { dxn: getObjectDXN(contact2)!, label: 'Erykah Badu' },
        ];
      default:
        return [];
    }
  }, []);

  return <DefaultStory<T> onQueryRefOptions={onQueryRefOptions} {...props} />;
};

const AddressSchema = Schema.Struct({
  street: Schema.optional(Schema.String.annotations({ title: 'Street' })),
  city: Schema.optional(Schema.String.annotations({ title: 'City' })),
  zip: Schema.optional(Schema.String.pipe(Schema.pattern(/^\d{5}(-\d{4})?$/)).annotations({ title: 'ZIP' })),
  location: Schema.optional(Format.GeoPoint.annotations({ title: 'Location' })),
}).annotations({ title: 'Address' });

const ContactSchema = Schema.Struct({
  name: Schema.optional(Schema.String.annotations({ title: 'Name' })),
  active: Schema.optional(Schema.Boolean.annotations({ title: 'Active' })),
  rank: Schema.optional(Schema.Number.annotations({ title: 'Rank' })),
  website: Schema.optional(Format.URL.annotations({ title: 'Website' })),
  address: Schema.optional(AddressSchema),
}).pipe(Schema.mutable);

type ContactSchema = Schema.Schema.Type<typeof ContactSchema>;

const meta = {
  title: 'ui/react-ui-form/Form',
  component: Form as any,
  render: DefaultStory,
  decorators: [withTheme, withSurfaceVariantsLayout()],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
  argTypes: {
    readonly: {
      control: 'boolean',
      description: 'Readonly',
    },
  },
} satisfies Meta<StoryProps<any>>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    schema: ContactSchema,
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

export const Organization: Story = {
  args: {
    debug: true,
    schema: Testing.OrganizationSchema,
    values: {
      name: 'DXOS',
      website: 'https://dxos.org',
    },
    readonly: false,
  },
};

export const OrganizationAutoSave: Story = {
  args: {
    debug: true,
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
// Property name is missing in type EncodedReference but required in type
export const Person: Story = {
  args: {
    debug: true,
    schema: Testing.Person,
    values: {
      name: 'Bot',
    },
  },
};

//
// Union
//

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

type ShapeSchema = Schema.Schema.Type<typeof ShapeSchema>;

export const DiscriminatedShape: StoryObj<StoryProps<ShapeSchema>> = {
  args: {
    debug: true,
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

//
// Arrays
//

const ArraysSchema = Schema.Struct({
  names: Schema.Array(Schema.String.pipe(Schema.nonEmptyString())),
  addresses: Schema.Array(AddressSchema),
}).pipe(Schema.mutable);

type ArraysSchema = Schema.Schema.Type<typeof ArraysSchema>;

export const Arrays: StoryObj<StoryProps<ArraysSchema>> = {
  args: {
    debug: true,
    schema: ArraysSchema,
    readonly: false,
    values: {
      names: ['Alice', 'Bob'],
      addresses: [],
    },
  },
};

//
// Tuple
//

// TODO(wittjosiah): Only GeoPoint is works currently.
const TupleSchema = Schema.Struct({
  tuple: Schema.Tuple(Schema.Number, Schema.String, Schema.Boolean),
  geopoint: Format.GeoPoint,
}).pipe(Schema.mutable);

type TupleSchema = Schema.Schema.Type<typeof TupleSchema>;

export const Tuple: StoryObj<StoryProps<TupleSchema>> = {
  args: {
    debug: true,
    schema: TupleSchema,
    readonly: false,
    values: {
      tuple: [1, 'a', true],
      geopoint: [-122.41941, 37.77492],
    },
  },
};

//
// Enum
//

const ColorSchema = Schema.Struct({
  color: Schema.Union(Schema.Literal('red'), Schema.Literal('green'), Schema.Literal('blue')).annotations({
    title: 'Color',
  }),
}).pipe(Schema.mutable);

type ColorType = Schema.Schema.Type<typeof ColorSchema>;

export const Enum: StoryObj<StoryProps<ColorType>> = {
  args: {
    debug: true,
    schema: ColorSchema,
    readonly: false,
    values: {
      color: 'red',
    },
  },
};

//
// Refs
//

const RefSchema = Schema.Struct({
  contact: Ref(ContactType).annotations({ title: 'Contact Reference' }),
  optionalContact: Schema.optional(Ref(ContactType).annotations({ title: 'Optional Contact Reference' })),
  refArray: Schema.optional(Schema.Array(Ref(ContactType))),
  unknownExpando: Schema.optional(Ref(Expando).annotations({ title: 'Optional Ref to an Expando (DXN Input)' })),
});

type RefSchema = Schema.Schema.Type<typeof RefSchema>;

const contact1 = live(ContactType, { identifiers: [] });
const contact2 = live(ContactType, { identifiers: [] });

export const Refs: StoryObj<StoryProps<RefSchema>> = {
  render: RefStory,
  args: {
    debug: true,
    schema: RefSchema,
    readonly: false,
    values: {
      refArray: [Ref.make(contact1), Ref.make(contact2)],
    },
  },
};
