//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { StatCard } from '../../../components/index.ts';

export type RawQueriesCardProps = {
  /** Filter shape (JSON) to the number of queries with that shape; see `groupQueriesByFilter`. */
  queries?: Map<string, number>;
};

export const RawQueriesCard = ({ queries = new Map() }: RawQueriesCardProps) => {
  const keys = Array.from(queries.keys()).sort();
  return (
    <StatCard.Root>
      <StatCard.Header icon='ph--tree-structure--regular' title='Query types' info={keys.length.toLocaleString()} />
      {keys.length === 0 && <StatCard.Row label='No queries.' />}
      {keys.map((key) => (
        <StatCard.Row
          key={key}
          label={<span className='font-mono'>{key}</span>}
          title={key}
          value={(queries.get(key) ?? 0).toLocaleString()}
        />
      ))}
    </StatCard.Root>
  );
};

RawQueriesCard.displayName = 'RawQueriesCard';
