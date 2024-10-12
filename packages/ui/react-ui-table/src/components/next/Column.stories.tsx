//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { withTheme, withLayout } from '@dxos/storybook-utils';

import { type ColumnProps } from './Column';
import { TestPopup } from './util';
import translations from '../../translations';

const Story = (props: ColumnProps) => <TestPopup></TestPopup>;

export default {
  title: 'react-ui-table/Column',
  decorators: [withTheme, withLayout()],
  parameters: {
    layout: 'centered',
    translations,
  },
  render: Story,
};

export const Default = {
  args: {},
};
