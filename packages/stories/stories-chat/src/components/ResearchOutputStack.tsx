//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework';
import { ResearchGraph } from '@dxos/assistant-testing';
import { Filter } from '@dxos/echo';
import { useQuery, useQueue } from '@dxos/react-client/echo';

import { type ComponentProps } from './types';

export const ResearchOutputStack = ({ space }: ComponentProps) => {
  const [researchGraph] = useQuery(space, Filter.type(ResearchGraph));
  const queue = useQueue(researchGraph?.queue.dxn);

  return (
    <div className='p-4 overflow-y-auto h-full'>
      <ul className='space-y-4 '>
        {queue?.objects.map((object) => (
          <li key={object.id}>
            <Surface role='card' data={{ subject: object }} limit={1} />
          </li>
        ))}
      </ul>
    </div>
  );
};
