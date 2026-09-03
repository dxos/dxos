//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';
import React, { useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { TestLayout } from '../../../../../testing/index.ts';
import { Form } from '../../../Form.tsx';

// A literal union auto-dispatches to SelectField.
const schema = Schema.Struct({
  status: Schema.Literals(['active', 'inactive', 'archived']).annotate({ title: 'Status' }),
}).mapFields(Struct.map(Schema.mutableKey));

type Values = Schema.Schema.Type<typeof schema>;

const DefaultStory = () => {
  const [values, setValues] = useState<Values>({ status: 'active' });
  return (
    <TestLayout json={values}>
      <Form.Root
        schema={schema}
        values={values}
        onValuesChanged={(values) => setValues((prev) => ({ ...prev, ...values }))}
      >
        <Form.Viewport>
          <Form.Content>
            <Form.FieldSet />
          </Form.Content>
        </Form.Viewport>
      </Form.Root>
    </TestLayout>
  );
};

const meta = {
  title: 'ui/react-ui-form/FormField/SelectField',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen', translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
