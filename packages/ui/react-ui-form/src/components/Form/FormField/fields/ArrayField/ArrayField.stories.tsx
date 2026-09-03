//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';
import React, { useState } from 'react';

import { FormLayoutAnnotation, FormOrderedAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { trim } from '@dxos/util';

import { translations } from '#translations';

import { TestLayout } from '../../../../../testing/index.ts';
import { Form } from '../../../Form.tsx';

// Mirrors the structure of `Pipeline` (`@dxos/types`): a scalar header plus an
// array of `Column`-like structs. The array is the field we render as either a
// static or an ordered (drag-to-reorder) list.
const Column = Schema.Struct({
  name: Schema.String.annotate({ title: 'Name' }),
  value: Schema.optional(Schema.Number.annotate({ title: 'Value' })),
})
  .mapFields(Struct.map(Schema.mutableKey))
  .pipe(
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

const columnsField = Schema.Array(Column).pipe(Schema.mutable, Schema.annotate({ title: 'Columns' }));

const headerFields = {
  name: Schema.String.pipe(Schema.annotate({ title: 'Name' }), Schema.optional),
  description: Schema.String.pipe(Schema.annotate({ title: 'Description' }), Schema.optional),
};

const Pipeline = Schema.Struct({
  ...headerFields,
  columns: columnsField,
}).mapFields(Struct.map(Schema.mutableKey));

const OrderedPipeline = Schema.Struct({
  ...headerFields,
  columns: columnsField.pipe(FormOrderedAnnotation.set(true)),
}).mapFields(Struct.map(Schema.mutableKey));

const StringPipeline = Schema.Struct({
  ...headerFields,
  columns: Schema.Array(Schema.String).pipe(FormOrderedAnnotation.set(true)),
}).mapFields(Struct.map(Schema.mutableKey));

type PipelineValues = { name?: string; description?: string; columns: readonly unknown[] };

// Object-array columns (matches `Pipeline` / `OrderedPipeline`).
const objectColumns: PipelineValues = {
  name: 'Sales',
  description: 'Lead qualification pipeline.',
  columns: [{ name: 'Contacts' }, { name: 'Organizations' }, { name: 'Tasks' }, { name: 'Messages', value: 100 }],
};

// String-array columns (matches `StringPipeline`); feeding object columns here renders `[object Object]`.
const stringColumns: PipelineValues = {
  name: 'Sales',
  description: 'Lead qualification pipeline.',
  columns: ['Contacts', 'Organizations', 'Tasks', 'Messages'],
};

const DefaultStory = ({ schema, values: initial }: { schema: Schema.Codec<any, any>; values: PipelineValues }) => {
  const [values, setValues] = useState<PipelineValues>(initial);

  return (
    <TestLayout json={values}>
      <Form.Root
        schema={schema}
        values={values}
        onValuesChanged={(next) => setValues((prev) => ({ ...prev, ...next }))}
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
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <DefaultStory schema={Pipeline} values={objectColumns} />,
};

export const Ordered: Story = {
  render: () => <DefaultStory schema={OrderedPipeline} values={objectColumns} />,
};

export const Simple: Story = {
  render: () => <DefaultStory schema={StringPipeline} values={stringColumns} />,
};
