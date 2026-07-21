//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { withClientProvider } from '@dxos/react-client/testing';
import { Card } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { TRADINGVIEW_SOURCE } from '../../constants';
import { Ibkr } from '../../types';
import { InstrumentCard } from './InstrumentCard';

// Fictional instrument only — this is a public repo (never real holdings).
const DefaultStory = () => {
  const subject = useMemo(
    () =>
      Ibkr.makeInstrument({
        name: 'Acme Corp.',
        symbol: 'ACME',
        exchange: 'NASDAQ',
        keys: [{ source: TRADINGVIEW_SOURCE, id: 'NASDAQ:ACME' }],
      }),
    [],
  );

  return (
    <Card.Root border={false} classNames='is-80'>
      <InstrumentCard subject={subject} />
    </Card.Root>
  );
};

const meta = {
  title: 'plugins/plugin-ibkr/InstrumentCard',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'centered' }), withClientProvider({ createIdentity: true })],
  parameters: { translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
