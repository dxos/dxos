//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { withTheme, withLayout } from '@dxos/storybook-utils';

import { FormEditor, type FormEditorProps } from './FormEditor';
import { table, TestSchema, type TestType } from './testing';
import translations from '../../translations';

const Story = (props: FormEditorProps) => (
  <div className='flex w-[240px] m-2 p-2 border border-separator rounded'>
    <FormEditor {...props} />
  </div>
);

export default {
  title: 'react-ui-table/FormEditor',
  decorators: [withTheme, withLayout()],
  parameters: {
    translations,
  },
  render: Story,
};

export const Default = {
  args: {
    schema: TestSchema,
    fields: table.columns,
  } satisfies FormEditorProps<TestType>,
};
