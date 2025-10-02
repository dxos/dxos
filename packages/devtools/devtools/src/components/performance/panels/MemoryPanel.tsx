//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { mx } from '@dxos/react-ui-theme';
import { Unit } from '@dxos/util';

import { type MemoryInfo } from '../../../hooks';
import { type CustomPanelProps, Panel } from '../Panel';

const MEM_WARNING = 40 / 100;

export const MemoryPanel = ({ memory, ...props }: CustomPanelProps<{ memory?: MemoryInfo }>) => {
  return (
    <Panel
      {...props}
      icon='ph--cpu--regular'
      title={'Memory'}
      info={
        <div className='flex items-center gap-2'>
          <span title='Used (heap size)'>{Unit.Megabyte(memory?.usedJSHeapSize ?? 0)}</span>
          <span title='Allocated (heap size)'>{Unit.Megabyte(memory?.totalJSHeapSize ?? 0)}</span>
          {memory?.used !== undefined && (
            <span title='Used (available)' className={mx(memory?.used > MEM_WARNING && 'text-red-500')}>
              {Unit.Percent(memory?.used ?? 0)}
            </span>
          )}
        </div>
      }
    />
  );
};
