//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { LevelMeter } from './LevelMeter.tsx';

const meta = {
  title: 'plugins/plugin-handpan/components/LevelMeter',
  component: LevelMeter,
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
  parameters: { translations },
} satisfies Meta<typeof LevelMeter>;

export default meta;

type Story = StoryObj<typeof meta>;

export const AboveThreshold: Story = {
  args: { level: 0.2, threshold: 0.02 },
};

export const BelowThreshold: Story = {
  args: { level: 0.005, threshold: 0.02 },
};
