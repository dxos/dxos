//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework';
import { ResearchGraph } from '@dxos/assistant-toolkit';
import { Filter } from '@dxos/echo';
import { useQuery, useQueue } from '@dxos/react-client/echo';

import { type ComponentProps } from './types';

export const ResearchOutputModule = ({ space }: ComponentProps) => {
  const [researchGraph] = useQuery(space, Filter.type(ResearchGraph));
  const queue = useQueue(researchGraph?.queue.dxn);

  return (
    <ul className='flex flex-col gap-4 p-4 bs-full overflow-y-auto'>
      {queue?.objects.map((object) => (
        <li key={object.id}>
          <Surface role='card' data={{ subject: object }} limit={1} />
        </li>
      ))}
    </ul>
  );
};
