//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { create } from '@dxos/echo-schema';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { Form, type FormProps } from './Form';
import { data, form, TestSchema, type TestType } from './testing';
import { TestPopup } from './util';
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
    schema: TestSchema,
    form,
  } satisfies FormProps<TestType>,
};

export const Empty = {
  args: {
    schema: TestSchema,
    form,
  } satisfies FormProps<TestType>,
};

export const Readonly = {
  args: {
    data: create(data),
    schema: TestSchema,
    form,
    readonly: true,
  } satisfies FormProps<TestType>,
};
