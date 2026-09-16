//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';

import { StatCard } from '../../../components/index.ts';

export type RawQueriesCardProps = {
  /** Filter shape (JSON) to the number of queries with that shape; see `groupQueriesByFilter`. */
  queries?: Map<string, number>;
};

export const RawQueriesCard = ({ queries = new Map() }: RawQueriesCardProps) => {
  const keys = Array.from(queries.keys()).sort();
  const [expanded, setExpanded] = useState<string>();
  return (
    <StatCard.Root>
      <StatCard.Header icon='ph--tree-structure--regular' title='Query types' info={keys.length.toLocaleString()} />
      {keys.length === 0 && <StatCard.Row label='No queries.' />}
      {keys.map((key) => {
        const open = expanded === key;
        return (
          <React.Fragment key={key}>
            <StatCard.Row
              open={open}
              onToggle={(open) => setExpanded(open ? key : undefined)}
              label={<span className='font-mono'>{key}</span>}
              value={(queries.get(key) ?? 0).toLocaleString()}
            />
            {open && (
              <StatCard.Content>
                <JsonHighlighter data={JSON.parse(key)} />
              </StatCard.Content>
            )}
          </React.Fragment>
        );
      })}
    </StatCard.Root>
  );
};

RawQueriesCard.displayName = 'RawQueriesCard';
