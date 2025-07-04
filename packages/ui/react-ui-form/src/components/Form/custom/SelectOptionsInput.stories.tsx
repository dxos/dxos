//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { Schema } from 'effect';
import React, { useState } from 'react';

import { SelectOptionSchema, type SelectOption } from '@dxos/echo-schema';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { SelectOptionInput } from './SelectOptionsInput';
import translations from '../../../translations';
import { TestLayout, TestPanel } from '../../testing';
import { Form } from '../Form';

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

const meta: Meta = {
  title: 'ui/react-ui-form/SelectOptionsInput',
  component: SelectOptionInput,
  render: DefaultStory,
  decorators: [withTheme, withLayout({ fullscreen: true })],
  parameters: {
    translations,
  },
};

export default meta;

type Story = StoryObj;

export const Default: Story = {};
