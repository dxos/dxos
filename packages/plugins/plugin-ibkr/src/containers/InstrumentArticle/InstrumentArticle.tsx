//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Ref } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { Flex, useTranslation } from '@dxos/react-ui';
import { Next } from '@dxos/react-ui/next';

import { FundamentalsPanel, TradingViewChart } from '#components';
import { Ibkr, IbkrOperation } from '#types';

import { meta } from '../../meta.ts';
import { resolveTradingViewSymbol } from '../../services/index.ts';

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
      .then(({ data, error }) => {
        if (error) {
          setFundamentals(undefined);
          setError(error.message);
          return;
        }
        setFundamentals(data);
      })
      .finally(() => setLoading(false));
  }, [invokePromise, instrument.symbol, subject]);

  useEffect(() => {
    loadFundamentals();
  }, [loadFundamentals]);

  return (
    <Next.Panel.Root role={role}>
      <Next.Panel.Body asChild>
        <Next.ScrollArea.Root orientation='vertical'>
          <Next.ScrollArea.Viewport classNames='p-4 space-y-4'>
            <Next.Card.Root fullWidth border={false}>
              <Next.Card.Header>
                <Next.Block />
                <Flex column gap='xs' classNames='min-w-0'>
                  <Next.Card.Title>
                    {instrument.symbol}
                    {instrument.name ? ` · ${instrument.name}` : ''}
                  </Next.Card.Title>
                  {(instrument.exchange || instrument.sector) && (
                    <Next.Card.Text variant='description'>
                      {[instrument.exchange, instrument.sector, instrument.industry].filter(Boolean).join(' · ')}
                    </Next.Card.Text>
                  )}
                </Flex>
                <Next.Block />
              </Next.Card.Header>
              <Next.Card.Body>
                <Next.Card.Row fullWidth>
                  <TradingViewChart symbol={tradingViewSymbol} className='h-[480px] w-full border-0' />
                </Next.Card.Row>
                <Next.Card.Row>
                  <Next.Card.Text variant='description'>{t('instrument.chart-attribution.label')}</Next.Card.Text>
                </Next.Card.Row>
              </Next.Card.Body>
            </Next.Card.Root>
            <FundamentalsPanel snapshot={fundamentals} loading={loading} error={error} onRefresh={loadFundamentals} />
          </Next.ScrollArea.Viewport>
        </Next.ScrollArea.Root>
      </Next.Panel.Body>
    </Next.Panel.Root>
  );
};

export default InstrumentArticle;

InstrumentArticle.displayName = 'InstrumentArticle';
