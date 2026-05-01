//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { mx } from '@dxos/ui-theme';
import { Unit } from '@dxos/util';

import { type CpuInfo } from '../../../hooks';
import { type CustomPanelProps, Panel } from '../Panel';

const HIGH_LOAD = 0.5;

export const CpuPanel = ({ cpu, ...props }: CustomPanelProps<{ cpu?: CpuInfo }>) => {
  return (
    <Panel
      {...props}
      icon='ph--cpu--regular'
      title='CPU'
      info={
        <div className='flex items-center gap-2'>
          {cpu?.frameRate !== undefined && <span title='Frame rate'>{cpu.frameRate} fps</span>}
          {cpu?.load !== undefined && (
            <span title='Main-thread load (5 s window)' className={mx(cpu.load > HIGH_LOAD && 'text-error-text')}>
              {String(Unit.Percent(cpu.load))}
            </span>
          )}
        </div>
      }
    />
  );
};
