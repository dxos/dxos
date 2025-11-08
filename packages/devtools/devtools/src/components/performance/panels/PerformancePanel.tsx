//
// Copyright 2024 DXOS.org
//

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
      icon='ph--hourglass-simple-low--regular'
      title='Performance'
      info={<span>{entries?.length.toLocaleString()}</span>}
    >
      <table className='table-fixed is-full text-xs font-mono'>
        <tbody>
          {entries?.map((entry, i) => (
            <tr key={i}>
              <td className='p-1 text-right'>{[entry.entryType, entry.name].filter(Boolean).join('/')}</td>
              <td className='p-1 w-[80px]' />
              <td className='p-1 w-[80px] text-right'>
                <Duration duration={entry.duration} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
};
