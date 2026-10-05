//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import * as SystemButton from '@dxos/react-ui/SystemButton';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { ReportSections } from '#components';
import { Ibkr, IbkrOperation } from '#types';

import { meta } from '../../meta.ts';
import { parseCash, parseClosedLots, parseOpenLots, parsePositions, parseTrades } from '../../services/index.ts';

export type PortfolioReportDetailProps = Pick<
  AppSurface.ObjectArticleProps<Ibkr.Report, {}, Ibkr.Portfolio>,
  'role' | 'subject' | 'companionTo'
>;

/**
 * Complementary plank for a selected {@link Ibkr.Report}: parses the stored Flex XML and renders the
 * aggregated open positions, recent trades, and cash balances, plus the per-lot breakdown and realized
 * closed lots when the query emits them. Parsing is memoized on the immutable report XML; the toolbar
 * copies the raw XML and can sync lots from this report into the owning portfolio.
 */
export const PortfolioReportDetail = ({ role, subject, companionTo }: PortfolioReportDetailProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const { invokePromise } = Hooks.useOperationInvoker();
  const db = Obj.getDatabase(subject);
  const positions = useMemo(() => parsePositions(subject.xml), [subject.xml]);
  const trades = useMemo(() => parseTrades(subject.xml), [subject.xml]);
  const cash = useMemo(() => parseCash(subject.xml), [subject.xml]);
  const openLots = useMemo(() => parseOpenLots(subject.xml), [subject.xml]);
  const closedLots = useMemo(() => parseClosedLots(subject.xml), [subject.xml]);

  const [syncingLots, setSyncingLots] = useState(false);

  const handleSyncLots = useCallback(async () => {
    if (!companionTo) {
      return;
    }
    setSyncingLots(true);
    try {
      await invokePromise(
        IbkrOperation.SyncLots,
        { account: Ref.make(companionTo), report: Ref.make(subject) },
        { spaceId: db?.spaceId },
      );
    } catch (error) {
      log.catch(error);
    } finally {
      setSyncingLots(false);
    }
  }, [companionTo, db?.spaceId, invokePromise, subject]);

  return (
    <Panel.Root role={role}>
      <Panel.Header>
        <Toolbar.Root classNames='justify-end'>
          {companionTo && (
            <Button.Root
              disabled={syncingLots}
              variant='primary'
              iconClassNames={syncingLots ? 'animate-spin' : undefined}
              icon={syncingLots ? 'ph--spinner-gap--regular' : 'ph--stack--regular'}
              label={syncingLots ? t('sync-lots.syncing.label') : t('sync-lots.label')}
              onClick={() => {
                void handleSyncLots();
              }}
            />
          )}
          <SystemButton.Clipboard label={t('copy-xml.label')} value={subject.xml} />
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body classNames='grid grid-rows-1 min-h-0'>
        <ReportSections positions={positions} trades={trades} cash={cash} openLots={openLots} closedLots={closedLots} />
      </Panel.Body>
    </Panel.Root>
  );
};

PortfolioReportDetail.displayName = 'PortfolioReportDetail';
