//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React, { useState } from 'react';

import { SelectOption } from '@dxos/echo/internal';
import { withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../../translations';
import { TestLayout } from '../../testing';
import { NewForm } from '../NewForm';

import { SelectOptionField } from './SelectOptionField';

const schema = Schema.Struct({
  options: Schema.Array(SelectOption).pipe(Schema.mutable),
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
      <NewForm.Root
        schema={schema}
        values={values}
        fieldMap={{ options: SelectOptionField }}
        onSave={(values) => setValues(values)}
      >
        <NewForm.Content>
          <NewForm.FieldSet />
          <NewForm.Actions />
        </NewForm.Content>
      </NewForm.Root>
    </TestLayout>
  );
};

const meta = {
  title: 'ui/react-ui-form/SelectOptionField',
  component: SelectOptionField as any,
  render: DefaultStory,
  decorators: [withTheme],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
