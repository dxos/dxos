//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React, { useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { TestLayout } from '../../../../../testing';
import { Form } from '../../../Form';

const schema = Schema.Struct({
  name: Schema.String.annotations({ title: 'Name' }),
}).pipe(Schema.mutable);

type Values = Schema.Schema.Type<typeof schema>;

const DefaultStory = () => {
  const [values, setValues] = useState<Values>({ name: 'Alice' });
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
  title: 'ui/react-ui-form/FormField/TextField',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen', translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
