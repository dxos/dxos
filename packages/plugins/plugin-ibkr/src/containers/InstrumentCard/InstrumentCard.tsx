//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { useObject } from '@dxos/echo-react';
import { Card } from '@dxos/react-ui';

import { TradingViewChart } from '#components';

import { resolveTradingViewSymbol } from '../../services';
import { type Ibkr } from '../../types';

export type InstrumentCardProps = AppSurface.ObjectCardProps<Ibkr.Instrument>;

/** Compact Instrument preview for card surfaces; chart only, no fundamentals fetch. */
export const InstrumentCard = ({ subject }: InstrumentCardProps) => {
  const [instrument] = useObject(subject);
  const tradingViewSymbol = useMemo(() => resolveTradingViewSymbol(instrument), [instrument]);

  return (
    <Card.Body>
      <Card.Row>
        <Card.Title>{instrument.symbol}</Card.Title>
      </Card.Row>
      <Card.Row>
        <Card.Text variant='description' classNames='line-clamp-1'>
          {[instrument.name, instrument.exchange, instrument.assetClass].filter(Boolean).join(' · ')}
        </Card.Text>
      </Card.Row>
      <TradingViewChart symbol={tradingViewSymbol} className='h-48 w-full border-0' variant='mini' />
    </Card.Body>
  );
};

export default InstrumentCard;

InstrumentCard.displayName = 'InstrumentCard';
