//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Query } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { Card } from '@dxos/react-ui';

import { ResearchInputQueue } from '../testing';
import { type ModuleProps } from './types';

export const ResearchOutputModule = ({ space }: ModuleProps) => {
  const [researchInput] = useQuery(space.db, Filter.type(ResearchInputQueue));
  const feed = researchInput?.feed.target;
  const objects = useQuery(
    space.db,
    feed ? Query.select(Filter.everything()).from(feed) : Query.select(Filter.nothing()),
  );

  return (
    <ul className='flex flex-col gap-4 p-4 h-full overflow-y-auto'>
      {objects.map((object) => (
        <li key={object.id}>
          <Card.Root>
            <Surface.Surface type={AppSurface.Card} data={{ subject: object }} limit={1} />
          </Card.Root>
        </li>
      ))}
    </ul>
  );
};
