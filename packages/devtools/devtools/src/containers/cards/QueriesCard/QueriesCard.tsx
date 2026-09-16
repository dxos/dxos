//
// Copyright 2026 DXOS.org
//

import React, { Fragment, useState } from 'react';

import { Grid, Tooltip } from '@dxos/react-ui';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/ui-theme';

import { STAT_CARD_HUES, StatCard } from '../../../components/index.ts';
import { type QueryInfo } from '../../../hooks/index.ts';
import { SLOW_TIME, Unit, groupQueriesByFilter } from '../util.tsx';

export type QueriesCardProps = {
  /** Most recent first. */
  queries?: QueryInfo[];
};

/** Shape takes the slack; fixed count and duration tracks line the figures up across rows. */
const ROW_TRACKS = ['1fr', '2.5rem', '4rem'];

/** One row per filter shape: how many queries share it and the slowest of them, disclosing each query. */
export const QueriesCard = ({ queries = [] }: QueriesCardProps) => {
  const [expanded, setExpanded] = useState<string>();
  const shapes = [...groupQueriesByFilter(queries).entries()].sort(([a], [b]) => a.localeCompare(b));
  return (
    <StatCard.Root>
      <StatCard.Header
        icon='ph--tree-view--regular'
        hue={STAT_CARD_HUES.database}
        title='Queries'
        info={queries.length.toLocaleString()}
      />
      {shapes.length === 0 && <StatCard.Row span label='No queries.' />}
      {shapes.map(([shape, group]) => {
        const slowest = Math.max(...group.map((query) => query.metrics.executionTime ?? 0));
        const open = expanded === shape;
        return (
          <Fragment key={shape}>
            <StatCard.Row open={open} onToggle={(open) => setExpanded(open ? shape : undefined)} unit='ms'>
              <Grid cols={ROW_TRACKS} gap='sm' align='center' classNames='font-mono text-end'>
                <Tooltip.Trigger asChild content={shape}>
                  <span className='truncate text-start'>{shape}</span>
                </Tooltip.Trigger>
                <span className='text-description'>×{group.length}</span>
                <span className={mx('tabular-nums', slowest > SLOW_TIME && 'text-error-text')}>{Unit.ms(slowest)}</span>
              </Grid>
            </StatCard.Row>
            {open && (
              <StatCard.Content>
                <JsonHighlighter
                  data={{
                    filter: JSON.parse(shape),
                    queries: group.map((query) => ({ active: query.active, ...query.metrics })),
                  }}
                />
              </StatCard.Content>
            )}
          </Fragment>
        );
      })}
    </StatCard.Root>
  );
};

QueriesCard.displayName = 'QueriesCard';
