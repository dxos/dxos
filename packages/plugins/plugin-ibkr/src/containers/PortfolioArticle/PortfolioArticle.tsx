//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Paths } from '@dxos/app-toolkit';
import { type AppSurface, useShowItem } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Query } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { Panel, ScrollArea, Toolbar, useTranslation } from '@dxos/react-ui';
import { linkedSegment, useArticleKeyboardNavigation, useSelection } from '@dxos/react-ui-attention';
import { Listbox } from '@dxos/react-ui-list';

import { meta } from '../../meta';
import { parseCash, parsePositions, parseTrades } from '../../services';
import { Ibkr } from '../../types';
import { PortfolioSyncAction } from './PortfolioSyncAction';

export type PortfolioArticleProps = AppSurface.ObjectArticleProps<Ibkr.Portfolio>;

/**
 * Article view for the Interactive Brokers {@link Portfolio}: lists the stored daily
 * {@link PortfolioReport} snapshots (newest first) from the Portfolio's backing feed. The toolbar
 * carries the connect/sync action (connect when no IBKR connection exists, sync once connected),
 * mirroring the Gmail mailbox. The daily-sync trigger lives in the companion properties panel.
 * Clicking a report opens it in the complementary plank via the app-graph-builder companion node.
 */
export const PortfolioArticle = ({ role, subject, attendableId }: PortfolioArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const showItem = useShowItem();

  // `useObject` re-renders when the Portfolio's feed ref resolves, so the query below picks up the feed.
  const [portfolio] = useObject(subject);
  const db = useMemo(() => Obj.getDatabase(portfolio), [portfolio]);
  const feed = portfolio.feed?.target;
  const reports = useQuery(
    db,
    feed ? Query.select(Filter.type(Ibkr.Report)).from(feed) : Query.select(Filter.nothing()),
  );
  // ISO timestamps sort lexicographically; show newest first.
  const sorted = useMemo(
    () => [...reports].sort((left, right) => right.fetchedAt.localeCompare(left.fetchedAt)),
    [reports],
  );
  // Parse each report's XML once when the feed changes, not on every render (e.g. selection changes).
  const rows = useMemo(
    () =>
      sorted.map((report) => ({
        id: report.id,
        date: report.fetchedAt,
        positions: parsePositions(report.xml).length,
        trades: parseTrades(report.xml).length,
        cash: parseCash(report.xml).length,
      })),
    [sorted],
  );

  const id = attendableId ?? Obj.getURI(subject);
  const currentId = useSelection(id, 'single');

  const handleNavigate = useCallback(
    (reportId: string) => {
      void showItem({
        contextId: id,
        selectionId: reportId,
        companion: linkedSegment('report'),
        path: Paths.getObjectPathFromObject(subject),
      });
    },
    [id, showItem, subject],
  );

  useArticleKeyboardNavigation({ articleId: id, items: sorted, currentId, onSelect: handleNavigate });

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <PortfolioSyncAction subject={subject} />
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content asChild>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport>
            <Listbox.Root value={currentId} onValueChange={handleNavigate}>
              <Listbox.Viewport>
                <Listbox.Content aria-label={t('reports.label')}>
                  {rows.map((row) => (
                    <Listbox.Item key={row.id} id={row.id}>
                      {t('report-row.label', {
                        date: row.date,
                        positions: row.positions,
                        trades: row.trades,
                        cash: row.cash,
                      })}
                    </Listbox.Item>
                  ))}
                </Listbox.Content>
              </Listbox.Viewport>
            </Listbox.Root>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};
