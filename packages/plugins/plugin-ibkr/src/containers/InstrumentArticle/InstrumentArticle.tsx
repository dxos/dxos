//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Obj, Ref } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import * as Block from '@dxos/react-ui/Block';
import * as Card from '@dxos/react-ui/Card';
import * as Flex from '@dxos/react-ui/Flex';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';

import { FundamentalsPanel, TradingViewChart } from '#components';
import { Ibkr, IbkrOperation } from '#types';

import { meta } from '../../meta.ts';
import { resolveTradingViewSymbol } from '../../services/index.ts';

export type InstrumentArticleProps = AppSurface.ObjectArticleProps<Ibkr.Instrument>;

/** Article surface for an Instrument: static header, TradingView chart, SEC EDGAR fundamentals via op. */
export const InstrumentArticle = ({ role, subject }: InstrumentArticleProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const { invokePromise } = Hooks.useOperationInvoker();
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
    <Panel.Root role={role}>
      <Panel.Body asChild>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport classNames='p-4 space-y-4'>
            <Card.Root border={false}>
              <Card.Header>
                <Block.Block />
                <Flex.Flex column gap='xs' classNames='min-w-0'>
                  <Card.Title>
                    {instrument.symbol}
                    {instrument.name ? ` · ${instrument.name}` : ''}
                  </Card.Title>
                  {(instrument.exchange || instrument.sector) && (
                    <Card.Text variant='muted'>
                      {[instrument.exchange, instrument.sector, instrument.industry].filter(Boolean).join(' · ')}
                    </Card.Text>
                  )}
                </Flex.Flex>
                <Block.Block />
              </Card.Header>
              <Card.Body>
                <Card.Row>
                  <TradingViewChart symbol={tradingViewSymbol} className='h-[480px] w-full border-0' />
                </Card.Row>
                <Card.Row>
                  <Card.Text variant='muted'>{t('instrument.chart-attribution.label')}</Card.Text>
                </Card.Row>
              </Card.Body>
            </Card.Root>
            <FundamentalsPanel snapshot={fundamentals} loading={loading} error={error} onRefresh={loadFundamentals} />
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Body>
    </Panel.Root>
  );
};

export default InstrumentArticle;

InstrumentArticle.displayName = 'InstrumentArticle';
