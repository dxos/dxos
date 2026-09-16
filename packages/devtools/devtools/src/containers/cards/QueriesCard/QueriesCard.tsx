//
// Copyright 2026 DXOS.org
//

import React, { Fragment, useState } from 'react';

import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';

import { StatCard } from '../../../components/index.ts';
import { type QueryInfo } from '../../../hooks/index.ts';
import { SLOW_TIME, Unit, groupQueriesByFilter } from '../util.tsx';

export type QueriesCardProps = {
  /** Most recent first. */
  queries?: QueryInfo[];
};

/** One row per filter shape: how many queries share it and the slowest of them, disclosing each query. */
export const QueriesCard = ({ queries = [] }: QueriesCardProps) => {
  const [expanded, setExpanded] = useState<string>();
  const shapes = [...groupQueriesByFilter(queries).entries()].sort(([a], [b]) => a.localeCompare(b));
  return (
    <StatCard.Root>
      <StatCard.Header icon='ph--tree-view--regular' title='Queries' info={queries.length.toLocaleString()} />
      {shapes.length === 0 && <StatCard.Row label='No queries.' />}
      {shapes.map(([shape, group]) => {
        const slowest = Math.max(...group.map((query) => query.metrics.executionTime ?? 0));
        const open = expanded === shape;
        return (
          <Fragment key={shape}>
            <StatCard.Row
              open={open}
              onToggle={(open) => setExpanded(open ? shape : undefined)}
              label={
                <span className='font-mono'>
                  {group.length} · {shape}
                </span>
              }
              title={`${group.length} queries`}
              value={Unit.ms(slowest)}
              unit='ms'
              warning={slowest > SLOW_TIME}
            />
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
