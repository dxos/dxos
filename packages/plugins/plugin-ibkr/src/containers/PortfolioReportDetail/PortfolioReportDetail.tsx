//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { IconButton, Panel, Toolbar, useTranslation } from '@dxos/react-ui';

import { ReportSections } from '../../components';
import { meta } from '../../meta';
import { parseCash, parseClosedLots, parseOpenLots, parsePositions, parseTrades } from '../../services';
import { type Ibkr } from '../../types';

export type PortfolioReportDetailProps = Pick<AppSurface.ObjectArticleProps<Ibkr.Report>, 'role' | 'subject'>;

/**
 * Complementary plank for a selected {@link Ibkr.Report}: parses the stored Flex XML and renders the
 * aggregated open positions, recent trades, and cash balances, plus the per-lot breakdown and realized
 * closed lots when the query emits them. Parsing is memoized on the immutable report XML; the toolbar
 * copies the raw XML.
 */
export const PortfolioReportDetail = ({ role, subject }: PortfolioReportDetailProps) => {
  const { t } = useTranslation(meta.profile.key);
  const positions = useMemo(() => parsePositions(subject.xml), [subject.xml]);
  const trades = useMemo(() => parseTrades(subject.xml), [subject.xml]);
  const cash = useMemo(() => parseCash(subject.xml), [subject.xml]);
  const openLots = useMemo(() => parseOpenLots(subject.xml), [subject.xml]);
  const closedLots = useMemo(() => parseClosedLots(subject.xml), [subject.xml]);

  const [copied, setCopied] = useState(false);
  const handleCopyXml = useCallback(() => {
    void navigator.clipboard.writeText(subject.xml).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {},
    );
  }, [subject.xml]);

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <Toolbar.Root classNames='justify-end'>
          <IconButton
            icon={copied ? 'ph--check--regular' : 'ph--copy--regular'}
            label={copied ? t('copied.label') : t('copy-xml.label')}
            onClick={handleCopyXml}
          />
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content classNames='grid grid-rows-1 min-bs-0'>
        <ReportSections positions={positions} trades={trades} cash={cash} openLots={openLots} closedLots={closedLots} />
      </Panel.Content>
    </Panel.Root>
  );
};
