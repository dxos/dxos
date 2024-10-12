//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { withTheme, withLayout } from '@dxos/storybook-utils';

import { Field, type FieldProps } from './Field';
import { form, TestSchema, type TestType } from './testing';
import { TestPopup } from './util';
import translations from '../../translations';

const Story = (props: FieldProps) => (
  <TestPopup>
    <Field {...props} />
  </TestPopup>
);

export default {
  title: 'react-ui-table/Field',
  decorators: [withTheme, withLayout()],
  parameters: {
    layout: 'centered',
    translations,
  },
  render: Story,
};

export const Default = {
  args: {
    field: form.fields[0],
    schema: TestSchema,
  } satisfies FieldProps<TestType>,
};
