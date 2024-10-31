//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React from 'react';

import { create } from '@dxos/echo-schema';
import { FieldSchema } from '@dxos/schema';
import { TestSchema, type TestType, testView } from '@dxos/schema/testing';
import { withTheme } from '@dxos/storybook-utils';

import { Field, type FieldProps } from './Field';
import translations from '../../translations';
import { TestPopup } from '../testing';

const DefaultStory = (args: FieldProps<typeof Field<TestType>>) => (
  <div>
    <TestPopup>
      <Field {...args} />
    </TestPopup>

    <div className='absolute right-2 bottom-2 font-mono text-xs p-2 border border-separator rounded'>
      <pre>{JSON.stringify(args, null, 2)}</pre>
    </div>
  </div>
);

export const Default: StoryObj<typeof Field<TestType>> = {
  args: {
    field: create(FieldSchema, testView.fields[0]),
    schema: TestSchema,
  },
};

const meta: Meta<typeof Field<TestType>> = {
  title: 'ui/react-ui-data/Field',
  component: Field,
  render: DefaultStory as any,
  decorators: [withTheme],
  parameters: {
    layout: 'centered',
    translations,
  },
};

export default meta;
