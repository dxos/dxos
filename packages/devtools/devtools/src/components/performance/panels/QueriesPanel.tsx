//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Icon } from '@dxos/react-ui';

import { type QueryInfo, removeEmpty } from '../../../hooks';
import { type CustomPanelProps, Panel } from '../Panel';
import { Duration } from '../util';

// TODO(burdon): Sort by time? Filter inactive?
export const QueriesPanel = ({ queries, ...props }: CustomPanelProps<{ queries: QueryInfo[] }>) => {
  if (!queries?.length) {
    return null;
  }

  return (
    <Panel
      {...props}
      icon='ph--tree-view--regular'
      title='Queries'
      info={<span>{queries.length.toLocaleString()}</span>}
    >
      <table className='table-fixed is-full text-xs font-mono'>
        <tbody>
          {queries.map((query, i) => (
            <tr key={i}>
              <td className='p-1 is-[24px]'>
                <Icon
                  icon={query.active ? 'ph--check--regular' : 'ph--x--regular'}
                  classNames={[!query.active && 'opacity-30']}
                />
              </td>
              <td className='p-1 truncate' title={JSON.stringify(removeEmpty(query.filter), undefined, 2)}>
                {/* {query.filter.type?.map((dxn) => dxn.toString()).join(', ')} */}
              </td>
              <td className='p-1 is-[80px] text-right'>{query.metrics.objectsReturned.toLocaleString()}</td>
              <td className='p-1 is-[80px] text-right'>
                <Duration duration={query.metrics.executionTime} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
};
