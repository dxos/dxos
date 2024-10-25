//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React from 'react';

import { create } from '@dxos/echo-schema';
import { TestSchema, type TestType, testView } from '@dxos/schema/testing';
import { withTheme } from '@dxos/storybook-utils';

import { Field, type FieldProps } from './Field';
import translations from '../../translations';
import { TestPopup } from '../testing';

const DefaultStory = (args: FieldProps<typeof Field<TestType>>) => (
  <TestPopup>
    <Field {...args} />
  </TestPopup>
);

export const Default: StoryObj<typeof Field<TestType>> = {
  args: {
    field: create(testView.fields[0]),
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
