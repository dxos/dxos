//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { create } from '@dxos/echo-schema';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { FormEditor, type FormEditorProps } from './FormEditor';
import { form, TestSchema, type TestType, TestPopup } from '../testing';
import translations from '../translations';
import type { FormType } from '../types';

const Story = (props: FormEditorProps) => (
  <TestPopup>
    <FormEditor {...props} />
  </TestPopup>
);

export default {
  title: 'react-ui-data/FormEditor',
  decorators: [withTheme, withLayout()],
  parameters: {
    layout: 'centered',
    translations,
  },
  render: Story,
};

export const Default = {
  args: {
    form: create(form),
    schema: TestSchema,
  } satisfies FormEditorProps<TestType>,
};

export const Empty = {
  args: {
    form: create<FormType>({ schema: TestSchema, fields: [] }),
    schema: TestSchema,
  } satisfies FormEditorProps<TestType>,
};
