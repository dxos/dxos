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
import { TupleField } from './TupleField';

// TupleField isn't auto-dispatched and needs a `binding`; wire it via `fieldMap`.
const schema = Schema.Struct({
  point: Schema.Struct({ x: Schema.Number, y: Schema.Number }).annotations({ title: 'Point' }),
}).pipe(Schema.mutable);

type Values = Schema.Schema.Type<typeof schema>;

const DefaultStory = () => {
  const [values, setValues] = useState<Values>({ point: { x: 1, y: 2 } });
  return (
    <TestLayout json={values}>
      <Form.Root
        schema={schema}
        values={values}
        fieldMap={{ point: (props) => <TupleField {...props} binding={['x', 'y']} /> }}
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
  title: 'ui/react-ui-form/Form/fields/TupleField',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen', translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
