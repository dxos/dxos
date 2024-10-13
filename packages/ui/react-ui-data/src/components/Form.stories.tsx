//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { create } from '@dxos/echo-schema';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { Form, type FormProps } from './Form';
import { data, view, TestSchema, type TestType, TestPopup } from '../testing';
import translations from '../translations';

const Story = (props: FormProps) => (
  <TestPopup>
    <Form {...props} />
  </TestPopup>
);

export default {
  title: 'react-ui-data/Form',
  decorators: [withTheme, withLayout()],
  parameters: {
    layout: 'centered',
    translations,
  },
  render: Story,
};

export const Default = {
  args: {
    data: create(data),
    view: create(view),
    schema: TestSchema,
  } satisfies FormProps<TestType>,
};

export const Empty = {
  args: {
    view: create(view),
    schema: TestSchema,
  } satisfies FormProps<TestType>,
};

export const Readonly = {
  args: {
    data: create(data),
    view: create(view),
    schema: TestSchema,
    readonly: true,
  } satisfies FormProps<TestType>,
};
