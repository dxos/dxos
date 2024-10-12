//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { withTheme, withLayout } from '@dxos/storybook-utils';

import { FormEditor, type FormEditorProps } from './FormEditor';
import { table, TestSchema, type TestType } from './testing';
import { TestPopup } from './util';
import translations from '../../translations';

const Story = (props: FormEditorProps) => (
  <TestPopup>
    <FormEditor {...props} />
  </TestPopup>
);

export default {
  title: 'react-ui-table/FormEditor',
  decorators: [withTheme, withLayout()],
  parameters: {
    layout: 'centered',
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
