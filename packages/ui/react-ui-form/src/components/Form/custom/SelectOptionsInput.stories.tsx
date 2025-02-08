//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React from 'react';

import { S, SelectOptionSchema, type SelectOption } from '@dxos/echo-schema';
import { withTheme } from '@dxos/storybook-utils';

import { SelectOptionInput } from './SelectOptionsInput';
import { TestLayout, TestPanel } from '../../testing';
import { Form } from '../Form';

const schema = S.Struct({
  options: S.Array(SelectOptionSchema).pipe(S.mutable),
}).pipe(S.mutable);

const DefaultStory = () => {
  const [values, setValues] = React.useState<{ options: SelectOption[] }>({
    // TODO(Zaymon): Pick colors from our limited set.
    options: [
      { id: 'opt_1', title: 'First option', color: '#6B7280' },
      { id: 'opt_2', title: 'Second option', color: '#3B82F6' },
      { id: 'opt_3', title: 'Third option', color: '#10B981' },
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
  decorators: [withTheme],
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: DefaultStory,
};
