//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React, { useState } from 'react';

import { Format } from '@dxos/echo';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { TestLayout } from '../../../../testing';
import { Form } from '../../Form';

// DateField covers all three temporal formats; show each.
const schema = Schema.Struct({
  date: Format.DateOnly.annotations({ title: 'Date' }),
  time: Format.TimeOnly.annotations({ title: 'Time' }),
  dateTime: Format.DateTime.annotations({ title: 'Date & time' }),
}).pipe(Schema.mutable);

type Values = Schema.Schema.Type<typeof schema>;

const DefaultStory = () => {
  const [values, setValues] = useState<Values>({
    date: '1990-05-12',
    time: '09:00:00',
    dateTime: '2026-06-01T15:30:00.000Z',
  });
  return (
    <TestLayout json={values}>
      <Form.Root schema={schema} values={values} onValuesChanged={(values) => setValues((prev) => ({ ...prev, ...values }))}>
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
  title: 'ui/react-ui-form/fields/DateField',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen', translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
