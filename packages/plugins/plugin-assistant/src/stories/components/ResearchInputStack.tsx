import React from 'react';
import { Filter, Obj } from '@dxos/echo';
import { useQuery, useQueue } from '@dxos/react-client/echo';
import { ResearchInputQueue } from '../testing';
import type { ComponentProps } from './types';
import { DebugCard } from './DebugCard';

export const ResearchInputStack = ({ space }: ComponentProps) => {
  const [researchInput] = useQuery(space, Filter.type(ResearchInputQueue));
  const queue = useQueue(researchInput?.queue.dxn);

  return (
    <div className='p-4 overflow-y-auto h-full'>
      <ul className='space-y-4 '>
        {queue?.objects.map((object) => (
          <li key={object.id}>
            <DebugCard obj={object} />
          </li>
        ))}
      </ul>
    </div>
  );
};
