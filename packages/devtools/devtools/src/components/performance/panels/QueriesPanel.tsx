//
// Copyright 2024 DXOS.org
//

import { Check, TreeView, X } from '@phosphor-icons/react';
import React from 'react';

import { getSize } from '@dxos/react-ui-theme';

import { type QueryInfo } from '../../../hooks';
import { type CustomPanelProps, Panel } from '../Panel';
import { Duration } from '../util';

export const QueriesPanel = ({ queries, ...props }: CustomPanelProps<{ queries: QueryInfo[] }>) => {
  return (
    <Panel {...props} icon={TreeView} title='Queries' info={<span>{queries.length.toLocaleString()}</span>}>
      <table className='table-fixed w-full text-xs font-mono'>
        <tbody>
          {queries.map((query, i) => (
            <tr key={i}>
              <td className='p-1 w-[24px]'>
                {query.active ? <Check className={getSize(4)} /> : <X className={getSize(4)} />}
              </td>
              <td className='p-1 text-right truncate' title={JSON.stringify(query.filter, undefined, 2)}>
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
