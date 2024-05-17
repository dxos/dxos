//
// Copyright 2024 DXOS.org
//

import { Check, TreeView, X } from '@phosphor-icons/react';
import React from 'react';

import { getSize, mx } from '@dxos/react-ui-theme';

import { type QueryInfo } from '../../../hooks';
import { type CustomPanelProps, Panel } from '../Panel';
import { Duration } from '../util';

export const maybeTruncateKey = (str: string) => (str.length > 32 ? str.slice(0, 8) : str);

// TODO(burdon): Move to util.
export const removeEmpty = (obj: any): any => {
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([_, v]) => v !== undefined && v !== null && v !== false && !(Array.isArray(v) && v.length === 0))
      .map(([k, v]) => [k, v === Object(v) ? removeEmpty(v) : typeof v === 'string' ? maybeTruncateKey(v) : v]),
  );
};

// TODO(burdon): Sort by time? Filter inactive?
export const QueriesPanel = ({ queries, ...props }: CustomPanelProps<{ queries: QueryInfo[] }>) => {
  if (!queries?.length) {
    return null;
  }

  return (
    <Panel {...props} icon={TreeView} title='Queries' info={<span>{queries.length.toLocaleString()}</span>}>
      <table className='table-fixed w-full text-xs font-mono'>
        <tbody>
          {queries.map((query, i) => (
            <tr key={i}>
              <td className='p-1 w-[24px]'>
                {query.active ? <Check className={getSize(4)} /> : <X className={mx(getSize(4), 'opacity-30')} />}
              </td>
              <td className='p-1 text-right truncate' title={JSON.stringify(removeEmpty(query.filter), undefined, 2)}>
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
