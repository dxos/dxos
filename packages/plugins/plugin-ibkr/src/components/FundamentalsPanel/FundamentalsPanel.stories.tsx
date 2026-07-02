//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { type Ibkr } from '../../types';
import { FundamentalsPanel } from './FundamentalsPanel';

const aaplSnapshot = {
  asOf: '2024-11-01',
  performance: {
    revenue: 391_035_000_000,
    netIncome: 93_736_000_000,
    eps: 6.08,
  },
  ratios: {
    roe: 1.646,
    debtToEquity: 5.409,
  },
  additional: {
    additionalFacts: {
      Assets: 364_980_000_000,
      Liabilities: 308_030_000_000,
      StockholdersEquity: 56_950_000_000,
    },
  },
} satisfies Ibkr.FundamentalsSnapshot;

const meta = {
  title: 'plugins/plugin-ibkr/FundamentalsPanel',
  component: FundamentalsPanel,
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
  parameters: { translations },
  args: {
    onRefresh: fn(),
  },
} satisfies Meta<typeof FundamentalsPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    snapshot: aaplSnapshot,
  },
};

export const Loading: Story = {
  args: {
    loading: true,
  },
};

export const Error: Story = {
  args: {
    error: 'SEC company facts request failed (503).',
  },
};

export const Empty: Story = {
  args: {
    snapshot: { asOf: '2024-11-01' },
  },
};
