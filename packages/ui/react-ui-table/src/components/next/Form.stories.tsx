//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { create } from '@dxos/echo-schema';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { Form, type FormProps } from './Form';
import { data, form, TestSchema, type TestType } from './testing';
import { TestPopup } from './testing';
import translations from '../../translations';

const Story = (props: FormProps) => (
  <TestPopup>
    <Form {...props} />
  </TestPopup>
);

export default {
  title: 'react-ui-table/Form',
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
    form: create(form),
    schema: TestSchema,
  } satisfies FormProps<TestType>,
};

export const Empty = {
  args: {
    form: create(form),
    schema: TestSchema,
  } satisfies FormProps<TestType>,
};

export const Readonly = {
  args: {
    data: create(data),
    form: create(form),
    schema: TestSchema,
    readonly: true,
  } satisfies FormProps<TestType>,
};
