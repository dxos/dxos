//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React, { useCallback, useState } from 'react';

import { AST, type BaseObject, Format, S } from '@dxos/echo-schema';
import { Testing } from '@dxos/schema/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { SelectInput } from './Defaults';
import { Form, type FormProps } from './Form';
import translations from '../../translations';
import { TestLayout, TestPanel } from '../testing';

// TODO(burdon): Translations?
const TestSchema = S.Struct({
  name: S.optional(S.String.annotations({ [AST.TitleAnnotationId]: 'Name' })),
  active: S.optional(S.Boolean.annotations({ [AST.TitleAnnotationId]: 'Active' })),
  rank: S.optional(S.Number.annotations({ [AST.TitleAnnotationId]: 'Rank' })),
  website: S.optional(Format.URL.annotations({ [AST.TitleAnnotationId]: 'Website' })),
  address: S.optional(
    S.Struct({
      street: S.optional(S.String.annotations({ [AST.TitleAnnotationId]: 'Street' })),
      city: S.optional(S.String.annotations({ [AST.TitleAnnotationId]: 'City' })),
      zip: S.optional(S.String.pipe(S.pattern(/^\d{5}(-\d{4})?$/)).annotations({ [AST.TitleAnnotationId]: 'ZIP' })),
      location: S.optional(Format.GeoPoint.annotations({ [AST.TitleAnnotationId]: 'Location' })),
    }).annotations({ [AST.TitleAnnotationId]: 'Address' }),
  ),
}).pipe(S.mutable);

type TestType = S.Schema.Type<typeof TestSchema>;

type StoryProps<T extends BaseObject> = { schema: S.Schema<T> } & FormProps<T>;

const DefaultStory = <T extends BaseObject>({ schema, values: initialValues }: StoryProps<T>) => {
  const [values, setValues] = useState(initialValues);
  const handleSave = useCallback<NonNullable<FormProps<T>['onSave']>>((values) => {
    setValues(values);
  }, []);

  return (
    <TestLayout json={{ values, schema: schema.ast.toJSON() }}>
      <TestPanel>
        <Form<T> schema={schema} values={values} onSave={handleSave} />
      </TestPanel>
    </TestLayout>
  );
};

const meta: Meta<StoryProps<any>> = {
  title: 'ui/react-ui-form/Form',
  component: Form,
  render: DefaultStory,
  decorators: [withLayout({ fullscreen: true, tooltips: true }), withTheme],
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

// TODO(burdon): Should accept partial values.
export const Org: Story<Testing.OrgSchemaType> = {
  args: {
    schema: Testing.OrgSchema,
    values: {
      name: 'DXOS',
      website: 'https://dxos.org',
    },
  },
};

// TODO(burdon): Type issue with employer reference.
// TODO(burdon): Test table/form with compound values (e.g., address).
// export const Contact: Story<Testing.ContactSchemaType> = {
//   args: {
//     schema: Testing.ContactSchema,
//     values: {
//       name: 'Bot',
//     },
//   },
// };

//
// TODO(burdon): Move into separate storybook and use test types.
//

const ShapeSchema = S.Struct({
  shape: S.optional(
    S.Union(
      S.Struct({
        type: S.Literal('circle').annotations({ [AST.TitleAnnotationId]: 'Type' }),
        radius: S.optional(S.Number.annotations({ [AST.TitleAnnotationId]: 'Radius' })),
      }),
      S.Struct({
        type: S.Literal('square').annotations({ [AST.TitleAnnotationId]: 'Type' }),
        size: S.optional(S.Number.annotations({ [AST.TitleAnnotationId]: 'Size' })),
      }),
    ).annotations({ [AST.TitleAnnotationId]: 'Shape' }),
  ),
}).pipe(S.mutable);

type ShapeType = S.Schema.Type<typeof ShapeSchema>;

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
              <SelectInput<ShapeType>
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
