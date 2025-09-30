//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { Schema } from 'effect';
import React, { useState } from 'react';

import { type SelectOption, SelectOptionSchema } from '@dxos/echo/internal';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { translations } from '../../../translations';
import { TestLayout, TestPanel } from '../../testing';
import { Form } from '../Form';

import { SelectOptionInput } from './SelectOptionsInput';

const schema = Schema.Struct({
  options: Schema.Array(SelectOptionSchema).pipe(Schema.mutable),
}).pipe(Schema.mutable);

const DefaultStory = () => {
  const [values, setValues] = useState<{ options: SelectOption[] }>({
    // TODO(Zaymon): Pick colors from our limited set.
    options: [
      { id: 'opt_1', title: 'First option', color: 'amber' },
      { id: 'opt_2', title: 'Second option', color: 'emerald' },
      { id: 'opt_3', title: 'Third option', color: 'rose' },
    ],
  });

  return (
    <TestLayout>
      <TestPanel>
        <Form
          schema={schema}
          values={values}
          onSave={(vals) => setValues(vals)}
          Custom={{ options: SelectOptionInput }}
        />
      </TestPanel>
    </TestLayout>
  );
};

const meta = {
  title: 'ui/react-ui-form/SelectOptionsInput',
  component: SelectOptionInput as any,
  render: DefaultStory,
  decorators: [withTheme, withLayout({ fullscreen: true })],
  parameters: {
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
