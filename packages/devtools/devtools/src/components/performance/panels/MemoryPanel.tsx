//
// Copyright 2024 DXOS.org
//

import { Cpu } from '@phosphor-icons/react';
import React from 'react';

import { mx } from '@dxos/react-ui-theme';

import { type MemoryInfo } from '../../../hooks';
import { type CustomPanelProps, Panel } from '../Panel';
import { Unit } from '../util';

const MEM_WARNING = 40 / 100;

export const MemoryPanel = ({ memory, ...props }: CustomPanelProps<{ memory?: MemoryInfo }>) => {
  return (
    <Panel
      {...props}
      icon={Cpu}
      title='Memory'
      info={
        <div className='flex items-center gap-2'>
          <span title='Used (heap size)'>{Unit.fixed(memory?.usedJSHeapSize ?? 0, Unit.M).toLocaleString()} MB</span>
          <span title='Allocated (heap size)'>
            {Unit.fixed(memory?.totalJSHeapSize ?? 0, Unit.M).toLocaleString()} MB
          </span>
          {memory?.used !== undefined && (
            <span title='Used (available)' className={mx(memory?.used > MEM_WARNING && 'text-red-500')}>
              {Unit.fixed(memory?.used, Unit.P).toLocaleString()}%
            </span>
          )}
        </div>
      }
    />
  );
};
