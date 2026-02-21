//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { ResearchGraph } from '@dxos/assistant-toolkit';
import { Filter } from '@dxos/echo';
import { useQuery, useQueue } from '@dxos/react-client/echo';
import { Card } from '@dxos/react-ui-mosaic';

import { type ComponentProps } from './types';

export const ResearchOutputModule = ({ space }: ComponentProps) => {
  const [researchGraph] = useQuery(space.db, Filter.type(ResearchGraph.ResearchGraph));
  const queue = useQueue(researchGraph?.queue.dxn);

  return (
    <ul className='flex flex-col gap-4 p-4 bs-full overflow-y-auto'>
      {queue?.objects.map((object) => (
        <li key={object.id}>
          <Card.Root>
            <Surface.Surface role='card--content' data={{ subject: object }} limit={1} />
          </Card.Root>
        </li>
      ))}
    </ul>
  );
};
