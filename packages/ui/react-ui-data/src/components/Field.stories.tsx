//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { create } from '@dxos/echo-schema';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { Field, type FieldProps } from './Field';
import { form, TestSchema, TestPopup, type TestType } from '../testing';
import translations from '../translations';

const Story = (props: FieldProps) => (
  <TestPopup>
    <Field {...props} />
  </TestPopup>
);

export default {
  title: 'react-ui-data/Field',
  decorators: [withTheme, withLayout()],
  parameters: {
    layout: 'centered',
    translations,
  },
  render: Story,
};

export const Default = {
  args: {
    field: create(form.fields[0]),
    schema: TestSchema,
  } satisfies FieldProps<TestType>,
};
