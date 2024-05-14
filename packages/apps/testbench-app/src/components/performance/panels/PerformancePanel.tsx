//
// Copyright 2024 DXOS.org
//

import { HourglassSimpleLow } from '@phosphor-icons/react';
import React from 'react';

import { Panel, Duration, type CustomPanelProps } from '../util';

export const PerformancePanel = ({ entries, ...props }: CustomPanelProps<{ entries?: PerformanceEntry[] }>) => {
  return (
    <Panel
      {...props}
      icon={HourglassSimpleLow}
      title='Performance'
      info={<span>{entries?.length.toLocaleString()}</span>}
    >
      <table className='w-full text-xs font-mono'>
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
