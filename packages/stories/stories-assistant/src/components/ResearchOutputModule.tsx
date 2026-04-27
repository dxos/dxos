//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Feed, Filter } from '@dxos/echo';
import { useQuery, useQueue } from '@dxos/react-client/echo';
import { Card } from '@dxos/react-ui';

import { ResearchInputQueue } from '../testing';

import { type ComponentProps } from './types';

export const ResearchOutputModule = ({ space }: ComponentProps) => {
  const [researchInput] = useQuery(space.db, Filter.type(ResearchInputQueue));
  const feed = researchInput?.feed.target;
  const queue = useQueue(feed ? Feed.getQueueDxn(feed) : undefined);

  return (
    <ul className='flex flex-col gap-4 p-4 h-full overflow-y-auto'>
      {queue?.objects.map((object) => (
        <li key={object.id}>
          <Card.Root>
            <Surface.Surface type={AppSurface.Card} data={{ subject: object }} limit={1} />
          </Card.Root>
        </li>
      ))}
    </ul>
  );
};
