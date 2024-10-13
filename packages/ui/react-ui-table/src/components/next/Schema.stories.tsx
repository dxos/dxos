//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { withTheme, withLayout } from '@dxos/storybook-utils';

import { type FormProps } from './Form';
import { TestSchema, TestPopup } from './testing';
import translations from '../../translations';

const Story = (props: FormProps) => <TestPopup></TestPopup>;

export default {
  title: 'react-ui-table/SchemaEditor',
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
  }, // TODO(burdon): !!!
};
