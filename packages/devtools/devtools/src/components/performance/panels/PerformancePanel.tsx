//
// Copyright 2024 DXOS.org
//

import { HourglassSimpleLow } from '@phosphor-icons/react';
import React from 'react';

import { type CustomPanelProps, Panel } from '../Panel';
import { Duration } from '../util';

export const PerformancePanel = ({ entries, ...props }: CustomPanelProps<{ entries?: PerformanceEntry[] }>) => {
  if (!entries?.length) {
    return null;
  }

  return (
    <Panel
      {...props}
      icon={HourglassSimpleLow}
      title='Performance'
      info={<span>{entries?.length.toLocaleString()}</span>}
    >
      <table className='w-full table-fixed font-mono text-xs'>
        <tbody>
          {entries?.map((entry, i) => (
            <tr key={i}>
              <td className='p-1 text-right'>{[entry.entryType, entry.name].filter(Boolean).join('/')}</td>
              <td className='w-[80px] p-1' />
              <td className='w-[80px] p-1 text-right'>
                <Duration duration={entry.duration} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
};
