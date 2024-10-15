//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { create } from '@dxos/echo-schema';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { Field, type FieldProps } from './Field';
import { view, TestSchema, TestPopup, type TestType } from '../../testing';
import translations from '../../translations';

const Story = (props: FieldProps<TestType>) => (
  <TestPopup>
    <Field {...props} />
  </TestPopup>
);

export default {
  title: 'react-ui-data/Field',
  decorators: [withTheme, withLayout({ fullscreen: true, classNames: 'flex p-4 justify-center' })],
  parameters: {
    layout: 'centered',
    translations,
  },
  render: Story,
};

export const Default = {
  args: {
    field: create(view.fields[0]),
    schema: TestSchema,
  } satisfies FieldProps<TestType>,
};
