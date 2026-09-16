//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { StatCard } from '../../../components/index.ts';
import { type QueryInfo, removeEmpty } from '../../../hooks/index.ts';
import { SLOW_TIME, Unit } from '../util.tsx';

export type QueriesCardProps = {
  /** Most recent first. */
  queries?: QueryInfo[];
};

export const QueriesCard = ({ queries = [] }: QueriesCardProps) => (
  <StatCard.Root>
    <StatCard.Header icon='ph--tree-view--regular' title='Queries' info={queries.length.toLocaleString()} />
    {queries.length === 0 && <StatCard.Row label='No queries.' />}
    {queries.map((query, index) => {
      const filter = JSON.stringify(removeEmpty(query.filter));
      const objects = (query.metrics.objectsReturned ?? 0).toLocaleString();
      const duration = query.metrics.executionTime ?? 0;
      return (
        <StatCard.Row
          key={index}
          icon={query.active ? 'ph--check--regular' : 'ph--x--regular'}
          iconClassNames={query.active ? undefined : 'opacity-30'}
          label={
            <span className='font-mono'>
              {objects} · {filter}
            </span>
          }
          title={`${objects} objects\n${JSON.stringify(removeEmpty(query.filter), undefined, 2)}`}
          value={Unit.ms(duration)}
          unit='ms'
          warning={duration > SLOW_TIME}
        />
      );
    })}
  </StatCard.Root>
);

QueriesCard.displayName = 'QueriesCard';
