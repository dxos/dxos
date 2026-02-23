//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';

import { ComposeEmailPanel, type ComposeEmailPanelProps } from './ComposeEmailPanel';

const DefaultStory = (props: ComposeEmailPanelProps) => {
  return <ComposeEmailPanel {...props} />;
};

const meta = {
  title: 'plugins/plugin-inbox/ComposeEmailPanel',
  component: ComposeEmailPanel,
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
    translations,
  },
} satisfies Meta<typeof ComposeEmailPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
