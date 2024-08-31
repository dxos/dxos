//
// Copyright 2024 DXOS.org
//

import { TreeView } from '@phosphor-icons/react';
import React from 'react';

import { type CustomPanelProps, Panel } from '../Panel';

export const RawQueriesPanel = ({ queries, ...props }: CustomPanelProps<{ queries: Map<string, number> }>) => {
  const keys = Array.from(queries.keys()).sort();

  return (
    <Panel {...props} icon={TreeView} title='Query types' info={<span>{keys.length.toLocaleString()}</span>}>
      <table className='w-full table-fixed font-mono text-xs'>
        <tbody>
          {keys.map((key, i) => (
            <tr key={i}>
              <td className='overflow-hidden p-1'>
                <pre className='font-2xs font-thin'>{key}</pre>
              </td>
              <td className='w-[80px] p-1 text-right'>{queries.get(key)!.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
};
