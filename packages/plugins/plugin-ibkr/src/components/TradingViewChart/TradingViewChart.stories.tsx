//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { TradingViewChart } from './TradingViewChart';

// Fictional symbol only — this is a public repo (never real holdings).
const meta = {
  title: 'plugins/plugin-ibkr/TradingViewChart',
  component: TradingViewChart,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof TradingViewChart>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Advanced: Story = {
  args: { symbol: 'NASDAQ:ACME', variant: 'advanced', className: 'h-[480px] w-full border-0' },
};

export const Mini: Story = {
  args: { symbol: 'NASDAQ:ACME', variant: 'mini', className: 'h-48 w-full border-0' },
};
