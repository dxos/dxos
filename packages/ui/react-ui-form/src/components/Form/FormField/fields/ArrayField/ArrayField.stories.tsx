//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React, { useState } from 'react';

import { FormLayoutAnnotation, FormOrderedAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { trim } from '@dxos/util';

import { translations } from '#translations';

import { TestLayout } from '../../../../../testing';
import { Form } from '../../../Form';

// Mirrors the structure of `Pipeline` (`@dxos/types`): a scalar header plus an
// array of `Column`-like structs. The array is the field we render as either a
// static or an ordered (drag-to-reorder) list.
const Column = Schema.Struct({
  name: Schema.String.annotations({ title: 'Name' }),
  value: Schema.optional(Schema.Number.annotations({ title: 'Value' })),
}).pipe(
  Schema.mutable,
  LabelAnnotation.set(['name']),
  FormLayoutAnnotation.set({
    default: trim`
      <grid cols="2">
        <field name="name"/>
        <field name="value"/>
      </grid>
    `,
  }),
);
type Column = Schema.Schema.Type<typeof Column>;

const columnsField = Schema.Array(Column).pipe(Schema.mutable, Schema.annotations({ title: 'Columns' }));

const headerFields = {
  name: Schema.String.pipe(Schema.annotations({ title: 'Name' }), Schema.optional),
  description: Schema.String.pipe(Schema.annotations({ title: 'Description' }), Schema.optional),
};

const Pipeline = Schema.Struct({
  ...headerFields,
  columns: columnsField,
}).pipe(Schema.mutable);

// `FormOrderedAnnotation` opts the array into a drag-to-reorder list (see `ArrayField`).
const OrderedPipeline = Schema.Struct({
  ...headerFields,
  columns: columnsField.pipe(FormOrderedAnnotation.set(true)),
}).pipe(Schema.mutable);

type Pipeline = Schema.Schema.Type<typeof Pipeline>;

const initialValues: Pipeline = {
  name: 'Sales',
  description: 'Lead qualification pipeline.',
  columns: [{ name: 'Contacts' }, { name: 'Organizations' }, { name: 'Tasks' }, { name: 'Messages', value: 100 }],
};

const StoryComponent = ({ schema }: { schema: typeof Pipeline }) => {
  const [values, setValues] = useState<Pipeline>(initialValues);

  return (
    <TestLayout json={values}>
      <Form.Root
        schema={schema}
        values={values}
        onValuesChanged={(values) => setValues((prev) => ({ ...prev, ...values }))}
      >
        <Form.Viewport scroll>
          <Form.Content>
            <Form.FieldSet />
          </Form.Content>
        </Form.Viewport>
      </Form.Root>
    </TestLayout>
  );
};

const meta = {
  title: 'ui/react-ui-form/FormField/ArrayField',
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <StoryComponent schema={Pipeline} />,
};

export const Ordered: Story = {
  render: () => <StoryComponent schema={OrderedPipeline} />,
};
