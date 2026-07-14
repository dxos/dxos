//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { Paths } from '@dxos/app-toolkit';
import { type AppSurface, useAppGraph, useShowItem } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Query, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { Connection } from '@dxos/plugin-connector';
import { useActionRunner } from '@dxos/plugin-graph';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { useAtomState } from '@dxos/react-hooks';
import { Panel, ScrollArea, useTranslation } from '@dxos/react-ui';
import { linkedSegment, useArticleKeyboardNavigation, useSelection } from '@dxos/react-ui-attention';
import { Listbox } from '@dxos/react-ui-list';
import { Menu, MenuBuilder, graphActions, isToolbarAction, useMenuBuilder } from '@dxos/react-ui-menu';

import { IBKR_CONNECTOR_ID } from '../../constants';
import { meta } from '../../meta';
import { parseCash, parsePositions, parseTrades } from '../../services';
import { Ibkr, IbkrOperation } from '../../types';
import { PortfolioImportAction } from './PortfolioImportAction';

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

  const { invokePromise } = useOperationInvoker();
  // IBKR has no SyncBinding, so the connection is detected space-wide by connectorId.
  const connections = useQuery(db, Filter.type(Connection.Connection));
  const connected = connections.some((connection) => connection.connectorId === IBKR_CONNECTOR_ID);
  // In-flight flag as an atom so the menu builder reads it reactively via `get`.
  const { atom: syncing, set: setSyncing } = useAtomState(false);
  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      // Report fetch is best-effort; lots sync runs from the latest stored report even when fetch fails.
      try {
        await invokePromise(IbkrOperation.SyncPortfolioReport, {}, { spaceId: db?.spaceId });
      } catch (error) {
        log.catch(error);
      }
      try {
        await invokePromise(IbkrOperation.SyncLots, { account: Ref.make(subject) }, { spaceId: db?.spaceId });
      } catch (error) {
        log.catch(error);
      }
    } finally {
      setSyncing(false);
    }
  }, [invokePromise, db, subject, setSyncing]);

  const { graph } = useAppGraph();
  const runAction = useActionRunner();
  const menuActions = useMenuBuilder(
    (get) => {
      // `MenuBuilder` mutates in place, so the conditional sync action is added without reassignment.
      const builder = MenuBuilder.make()
        .root({ label: ['portfolio-toolbar.menu', { ns: meta.profile.key }] })
        .action(
          'import',
          {
            variant: 'custom',
            label: ['import.label', { ns: meta.profile.key }],
            render: () => <PortfolioImportAction subject={subject} />,
          },
          () => {},
        );
      if (connected) {
        const isSyncing = get(syncing);
        builder.action(
          'sync',
          {
            label: ['sync.label', { ns: meta.profile.key }],
            icon: isSyncing ? 'ph--spinner-gap--regular' : 'ph--arrows-clockwise--regular',
            variant: 'primary',
            iconOnly: false,
            disabled: isSyncing,
          },
          () => {
            void handleSync();
          },
        );
      }
      return builder
        .separator('gap')
        .subgraph(graphActions(graph, get, id, { filter: isToolbarAction }))
        .build();
    },
    [graph, id, subject, connected, syncing, handleSync],
  );

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
      <Menu.Root {...menuActions} onAction={runAction} attendableId={id}>
        <Panel.Toolbar asChild>
          <Menu.Toolbar />
        </Panel.Toolbar>
      </Menu.Root>
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

PortfolioArticle.displayName = 'PortfolioArticle';
