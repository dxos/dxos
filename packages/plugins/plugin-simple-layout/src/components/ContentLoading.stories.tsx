//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withTheme } from '@dxos/react-ui/testing';

import { ContentLoading } from './ContentLoading';

const meta = {
  title: 'plugins/plugin-simple-layout/ContentLoading',
  component: ContentLoading,
  decorators: [withTheme],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof ContentLoading>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
