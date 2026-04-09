//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { ExemplarStatusIndicator } from './ExemplarStatusIndicator';

const meta = {
  title: 'plugins/plugin-exemplar/ExemplarStatusIndicator',
  component: ExemplarStatusIndicator,
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
} satisfies Meta<typeof ExemplarStatusIndicator>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
