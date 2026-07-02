//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { ReportSections } from './ReportSections';

const meta = {
  title: 'plugins/plugin-ibkr/ReportSections',
  component: ReportSections,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen', translations },
} satisfies Meta<typeof ReportSections>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    positions: [
      {
        symbol: 'ACME',
        quantity: 15,
        markPrice: 200,
        positionValue: 3000,
        costBasis: 160,
        unrealizedPnl: 600,
        currency: 'USD',
      },
      {
        symbol: 'GLBX',
        quantity: 8,
        markPrice: 50,
        positionValue: 400,
        costBasis: 55,
        unrealizedPnl: -40,
        currency: 'EUR',
      },
    ],
    trades: [
      { date: '20240115', side: 'BUY', quantity: 10, symbol: 'ACME', price: 150, currency: 'USD' },
      { date: '20260521', side: 'SELL', quantity: -4, symbol: 'WIDG', price: 200, currency: 'USD' },
    ],
    cash: [
      { currency: 'USD', endingCash: 1000 },
      { currency: 'EUR', endingCash: 500 },
    ],
    openLots: [
      {
        symbol: 'ACME',
        quantity: 10,
        acquired: '20240115',
        costBasis: 1500,
        markPrice: 200,
        value: 2000,
        unrealizedPnl: 500,
        currency: 'USD',
      },
      {
        symbol: 'ACME',
        quantity: 5,
        acquired: '20250820',
        costBasis: 900,
        markPrice: 200,
        value: 1000,
        unrealizedPnl: 100,
        currency: 'USD',
      },
    ],
    closedLots: [
      {
        symbol: 'WIDG',
        acquired: '20240301',
        sold: '20260521',
        quantity: -4,
        costBasis: 700,
        proceeds: 900,
        realizedPnl: 200,
        currency: 'USD',
      },
      {
        symbol: 'ZETA',
        acquired: '20251201',
        sold: '20260210',
        quantity: -3,
        costBasis: 600,
        proceeds: 540,
        realizedPnl: -60,
        currency: 'USD',
      },
    ],
  },
};

export const Empty: Story = {
  args: { positions: [], trades: [], cash: [], openLots: [], closedLots: [] },
};
