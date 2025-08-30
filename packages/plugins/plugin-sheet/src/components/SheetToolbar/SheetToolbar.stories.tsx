//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { translations } from '../../translations';

import { SheetToolbar } from './SheetToolbar';

const DefaultStory = () => {
  return <SheetToolbar id='test' />;
};

export const Default: Story = {};

const meta = {
  title: 'plugins/plugin-sheet/Toolbar',
  component: SheetToolbar,
  render: DefaultStory,
  decorators: [withTheme, withLayout()],
  parameters: { translations, layout: 'fullscreen' },
} satisfies Meta<typeof SheetToolbar>;

export default meta;

type Story = StoryObj<typeof meta>;
