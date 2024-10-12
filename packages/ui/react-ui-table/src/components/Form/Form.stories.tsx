//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { create } from '@dxos/echo-schema';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { Form, type FormProps } from './Form';
import { data, table, TestSchema, type TestType } from './testing';
import translations from '../../translations';

const Story = (props: FormProps) => (
  <div className='flex w-[240px] m-2 p-2 border border-separator rounded'>
    <Form {...props} />
  </div>
);

export default {
  title: 'react-ui-table/Form',
  decorators: [withTheme, withLayout()],
  parameters: {
    translations,
  },
  render: Story,
};

export const Default = {
  args: {
    data: create(data),
    schema: TestSchema,
    fields: table.columns,
  } satisfies FormProps<TestType>,
};

export const Empty = {
  args: {
    schema: TestSchema,
    fields: table.columns,
  } satisfies FormProps<TestType>,
};

export const Readonly = {
  args: {
    data: create(data),
    schema: TestSchema,
    fields: table.columns,
    readonly: true,
  } satisfies FormProps<TestType>,
};
