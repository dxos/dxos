//
// Copyright 2026 DXOS.org
//

import React, { Fragment, useState } from 'react';

import { type QueryMetrics } from '@dxos/echo-client';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import * as Button from '@dxos/react-ui/Button';
import * as Layout from '@dxos/react-ui/Layout';
import * as Tooltip from '@dxos/react-ui/Tooltip';
import { mx } from '@dxos/ui-theme';

import { STAT_CARD_HUES, StatCard } from '../../../components/index.ts';
import { Unit, averageQueryTime, queryFiredCount, queryTimeClassName, shortQueryText } from '../util.tsx';

export type QueriesCardProps = {
  queries?: QueryMetrics[];
  /** Rows shown; the rest are in the devtools page `onOpen` navigates to. */
  limit?: number;
  /** Opens the full queries page. */
  onOpen?: () => void;
};

/** Query takes the slack; fixed fired, active, items and duration tracks line the figures up across rows. */
const ROW_TRACKS = ['minmax(0,1fr)', '2rem', '1.5rem', '2.5rem', '3rem'];

/** The slowest queries, one row per query text: how often it fired, how many run reactively, what it returns. */
export const QueriesCard = ({ queries = [], limit = 10, onOpen }: QueriesCardProps) => {
  const [expanded, setExpanded] = useState<string>();
  const slowest = [...queries].sort((a, b) => b.maxTime - a.maxTime || a.query.localeCompare(b.query)).slice(0, limit);
  const active = queries.reduce((sum, query) => sum + query.active, 0);
  return (
    <StatCard.Root>
      <StatCard.Header
        icon='ph--tree-view--regular'
        hue={STAT_CARD_HUES.database}
        title='Queries'
        info={`${active.toLocaleString()} active · ${queries.length.toLocaleString()}`}
        action={
          onOpen && (
            <Button.Root
              iconOnly
              variant='ghost'
              icon='ph--arrow-square-out--regular'
              label='Open in devtools'
              onClick={onOpen}
            />
          )
        }
      />
      {slowest.length === 0 && <StatCard.Row span label='No queries.' />}
      {slowest.length > 0 && (
        <StatCard.Row unit='ms'>
          <Layout.Grid grow cols={ROW_TRACKS} gap='sm' classNames='text-end text-fg-muted'>
            <span className='text-start'>query</span>
            <span>fired</span>
            <span>live</span>
            <span>items</span>
            <span>max</span>
          </Layout.Grid>
        </StatCard.Row>
      )}
      {slowest.map((query) => {
        const open = expanded === query.query;
        return (
          <Fragment key={query.query}>
            <StatCard.Row open={open} onToggle={(open) => setExpanded(open ? query.query : undefined)} unit='ms'>
              <Layout.Grid grow cols={ROW_TRACKS} gap='sm' align='center' classNames='font-mono text-end tabular-nums'>
                <Tooltip.Trigger asChild content={query.query}>
                  <span className='truncate text-start'>{shortQueryText(query.query)}</span>
                </Tooltip.Trigger>
                <span className='text-fg-muted'>{queryFiredCount(query).toLocaleString()}</span>
                <span className={mx(query.active > 0 ? 'text-success-text' : 'text-fg-muted')}>{query.active}</span>
                <span>{query.lastCount.toLocaleString()}</span>
                <span className={queryTimeClassName(query.maxTime)}>{Unit.ms(query.maxTime)}</span>
              </Layout.Grid>
            </StatCard.Row>
            {open && (
              <StatCard.Content>
                <JsonHighlighter data={{ ...query, avgTime: averageQueryTime(query) }} />
              </StatCard.Content>
            )}
          </Fragment>
        );
      })}
    </StatCard.Root>
  );
};

QueriesCard.displayName = 'QueriesCard';
