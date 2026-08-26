//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type HeapInfo } from '@dxos/tracing';
import { mx } from '@dxos/ui-theme';
import { Unit } from '@dxos/util';

import { type MemoryInfo } from '../../../hooks';
import { type CustomPanelProps, Panel } from '../Panel';

const MEM_WARNING = 40 / 100;

/** One realm's heap: used of allocated, and used as a fraction of the realm's limit. */
const HeapRow = ({ label, heap }: { label: string; heap?: HeapInfo }) => {
  const used = heap && heap.used / heap.limit;
  return (
    <>
      <span className='text-subdued'>{label}</span>
      <span className='text-end' title='Used / allocated heap'>
        {heap ? `${Unit.Megabyte(heap.used)} / ${Unit.Megabyte(heap.total)}` : 'n/a'}
      </span>
      <span
        className={mx('text-end', used !== undefined && used > MEM_WARNING && 'text-error-text')}
        title='Used of limit'
      >
        {used !== undefined ? String(Unit.Percent(used)) : ''}
      </span>
    </>
  );
};

export const MemoryPanel = ({ memory, ...props }: CustomPanelProps<{ memory?: MemoryInfo }>) => {
  return (
    <Panel
      {...props}
      icon='ph--cpu--regular'
      title={'Memory'}
      info={
        <div className='grid grid-cols-[auto_auto_auto] gap-x-2'>
          <HeapRow label='tab' heap={memory?.tab} />
          <HeapRow label='worker' heap={memory?.worker} />
        </div>
      }
    />
  );
};
