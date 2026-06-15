//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { SampleStatusIndicator } from './SampleStatusIndicator';

const meta = {
  title: 'plugins/plugin-sample/SampleStatusIndicator',
  component: SampleStatusIndicator,
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
} satisfies Meta<typeof SampleStatusIndicator>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
