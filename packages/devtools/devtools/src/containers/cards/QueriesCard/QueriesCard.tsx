//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';

import { StatCard } from '../../../components/index.ts';
import { type QueryInfo, removeEmpty } from '../../../hooks/index.ts';
import { SLOW_TIME, Unit } from '../util.tsx';

export type QueriesCardProps = {
  /** Most recent first. */
  queries?: QueryInfo[];
};

export const QueriesCard = ({ queries = [] }: QueriesCardProps) => {
  const [expanded, setExpanded] = useState<number>();
  return (
    <StatCard.Root>
      <StatCard.Header icon='ph--tree-view--regular' title='Queries' info={queries.length.toLocaleString()} />
      {queries.length === 0 && <StatCard.Row label='No queries.' />}
      {queries.map((query, index) => {
        const filter = removeEmpty(query.filter);
        const objects = (query.metrics.objectsReturned ?? 0).toLocaleString();
        const duration = query.metrics.executionTime ?? 0;
        const open = expanded === index;
        return (
          <React.Fragment key={index}>
            <StatCard.Row
              open={open}
              onToggle={(open) => setExpanded(open ? index : undefined)}
              label={
                <span className={query.active ? 'font-mono' : 'font-mono text-subdued'}>
                  {objects} · {JSON.stringify(filter)}
                </span>
              }
              title={query.active ? `${objects} objects` : `${objects} objects (inactive)`}
              value={Unit.ms(duration)}
              unit='ms'
              warning={duration > SLOW_TIME}
            />
            {open && (
              <StatCard.Content>
                <JsonHighlighter data={{ active: query.active, filter, metrics: query.metrics }} />
              </StatCard.Content>
            )}
          </React.Fragment>
        );
      })}
    </StatCard.Root>
  );
};

QueriesCard.displayName = 'QueriesCard';
