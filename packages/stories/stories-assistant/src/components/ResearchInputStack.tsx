//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Filter } from '@dxos/echo';
import { useQuery, useQueue } from '@dxos/react-client/echo';

import { ResearchInputQueue } from '../testing';

import { DebugCard } from './DebugCard';
import { type ComponentProps } from './types';

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
