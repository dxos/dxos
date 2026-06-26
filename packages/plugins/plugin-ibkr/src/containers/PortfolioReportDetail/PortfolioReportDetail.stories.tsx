//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { Ibkr } from '../../types';
import { PortfolioReportDetail } from './PortfolioReportDetail';

// Mirrors live Flex output: no levelOfDetail attribute — the aggregate row per instrument has an
// empty openDateTime, and each tax-lot row carries its own. Symbols/amounts are fictional.
const SAMPLE_XML = `<FlexQueryResponse queryName="Composer" type="AF">
<FlexStatements count="1">
<FlexStatement accountId="U0000000" fromDate="20250101" toDate="20251231">
<OpenPositions>
<OpenPosition currency="USD" symbol="ACME" position="15" markPrice="200" positionValue="3000" costBasisPrice="160" costBasisMoney="2400" fifoPnlUnrealized="600" openDateTime="" />
<OpenPosition currency="USD" symbol="ACME" position="10" markPrice="200" positionValue="2000" costBasisMoney="1500" fifoPnlUnrealized="500" openDateTime="20240115;120000" />
<OpenPosition currency="USD" symbol="ACME" position="5" markPrice="200" positionValue="1000" costBasisMoney="900" fifoPnlUnrealized="100" openDateTime="20250820;120000" />
<OpenPosition currency="EUR" symbol="GLBX" position="8" markPrice="50" positionValue="400" costBasisPrice="55" costBasisMoney="440" fifoPnlUnrealized="-40" openDateTime="" />
<OpenPosition currency="EUR" symbol="GLBX" position="8" markPrice="50" positionValue="400" costBasisMoney="440" fifoPnlUnrealized="-40" openDateTime="20250610;100000" />
</OpenPositions>
<Trades>
<Trade currency="USD" symbol="ACME" tradeDate="20240115" buySell="BUY" quantity="10" tradePrice="150" ibCommission="-1" />
<Trade currency="USD" symbol="WIDG" tradeDate="20260521" buySell="SELL" quantity="-4" tradePrice="200" ibCommission="-1" />
<Lot currency="USD" symbol="WIDG" openDateTime="20240301" tradeDate="20260521" quantity="-4" cost="700" proceeds="900" fifoPnlRealized="200" />
</Trades>
<CashReport>
<CashReportCurrency currency="USD" endingCash="1000" />
<CashReportCurrency currency="EUR" endingCash="500" />
<CashReportCurrency currency="BASE_SUMMARY" endingCash="1500" />
</CashReport>
</FlexStatement>
</FlexStatements>
</FlexQueryResponse>`;

const DefaultStory = () => {
  const subject = useMemo(() => Obj.make(Ibkr.Report, { xml: SAMPLE_XML, fetchedAt: '2026-06-13T06:00:00.000Z' }), []);
  return <PortfolioReportDetail role='article' subject={subject} />;
};

const meta = {
  title: 'plugins/plugin-ibkr/PortfolioReportDetail',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' }), withClientProvider({ createIdentity: true })],
  parameters: { layout: 'fullscreen', translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
