//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Ref } from '@dxos/echo';
import { useObject } from '@dxos/react-client/echo';
import { Card, Panel, ScrollArea, useTranslation } from '@dxos/react-ui';

import { FundamentalsPanel, TradingViewChart } from '#components';

import { meta } from '../../meta';
import { resolveTradingViewSymbol } from '../../services';
import { type Ibkr, IbkrOperation } from '../../types';

export type InstrumentArticleProps = AppSurface.ObjectArticleProps<Ibkr.Instrument>;

/** Article surface for an Instrument: static header, TradingView chart, SEC EDGAR fundamentals via op. */
export const InstrumentArticle = ({ role, subject }: InstrumentArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const [instrument] = useObject(subject);
  const tradingViewSymbol = useMemo(() => resolveTradingViewSymbol(instrument), [instrument]);
  const [fundamentals, setFundamentals] = useState<Ibkr.FundamentalsSnapshot>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const loadFundamentals = useCallback(() => {
    if (!invokePromise || !instrument.symbol?.trim()) {
      return;
    }
    setLoading(true);
    setError(undefined);
    void invokePromise(
      IbkrOperation.GetInstrumentFundamentals,
      { instrument: Ref.make(subject) },
      { spaceId: Obj.getDatabase(subject)?.spaceId },
    )
      .then(({ data }) => setFundamentals(data))
      .catch((cause) => setError(cause instanceof Error ? cause.message : String(cause)))
      .finally(() => setLoading(false));
  }, [invokePromise, instrument.symbol, subject]);

  useEffect(() => {
    loadFundamentals();
  }, [loadFundamentals]);

  return (
    <Panel.Root role={role}>
      <Panel.Content asChild>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport className='p-4 space-y-4'>
            <Card.Root fullWidth border={false}>
              <Card.Header>
                <Card.Block />
                <div className='flex min-w-0 flex-col gap-0.5'>
                  <Card.Title>
                    {instrument.symbol}
                    {instrument.name ? ` · ${instrument.name}` : ''}
                  </Card.Title>
                  {(instrument.exchange || instrument.sector) && (
                    <Card.Text variant='description'>
                      {[instrument.exchange, instrument.sector, instrument.industry].filter(Boolean).join(' · ')}
                    </Card.Text>
                  )}
                </div>
                <Card.Block />
              </Card.Header>
              <Card.Body>
                <Card.Row fullWidth>
                  <TradingViewChart symbol={tradingViewSymbol} className='h-[480px] w-full border-0' />
                </Card.Row>
                <Card.Row>
                  <Card.Text variant='description'>{t('instrument.chart-attribution.label')}</Card.Text>
                </Card.Row>
              </Card.Body>
            </Card.Root>
            <FundamentalsPanel snapshot={fundamentals} loading={loading} error={error} onRefresh={loadFundamentals} />
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};

export default InstrumentArticle;
