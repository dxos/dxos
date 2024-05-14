//
// Copyright 2024 DXOS.org
//

import { Database } from '@phosphor-icons/react';
import React from 'react';

import { type QueryInfo } from '../../../hooks';
import { Panel, Duration, type CustomPanelProps } from '../util';

export const QueriesPanel = ({ queries, ...props }: CustomPanelProps<{ queries: QueryInfo[] }>) => {
  return (
    <Panel {...props} icon={Database} title='Queries' info={<span>{queries.length.toLocaleString()}</span>}>
      <table className='w-full text-xs font-mono'>
        <tbody>
          {queries.map((query, i) => (
            <tr key={i}>
              <td className='p-1 text-right'>{query.active && <span>A</span>}</td>
              <td className='p-1 text-right' title={JSON.stringify(query.filter, undefined, 2)}>
                {query.filter.type?.itemId}
              </td>
              <td className='p-1 w-[80px] text-right'>{query.metrics.objectsReturned.toLocaleString()}</td>
              <td className='p-1 w-[80px] text-right'>
                <Duration duration={query.metrics.executionTime} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
};
