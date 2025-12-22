//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type Entity, Filter, Obj } from '@dxos/echo';
import { useQuery, useQueue } from '@dxos/react-client/echo';
import { getHashHue } from '@dxos/ui-theme';

import { ResearchInputQueue } from '../testing';

import { type ComponentProps } from './types';

export const ResearchInputModule = ({ space }: ComponentProps) => {
  const [researchInput] = useQuery(space.db, Filter.type(ResearchInputQueue));
  const queue = useQueue(researchInput?.queue.dxn);

  return (
    <ul className='flex flex-col gap-4 p-4 bs-full overflow-y-auto'>
      {queue?.objects.map((object) => (
        <li key={object.id}>
          <DebugCard object={object} />
        </li>
      ))}
    </ul>
  );
};

type DebugCardProps = {
  object: Entity.Unknown;
};

const DebugCard = ({ object }: DebugCardProps) => {
  return (
    <div className='border border-separator rounded-lg p-4 bg-surface'>
      <div className='flex items-center justify-between mb-2'>
        <h3 className='font-medium text-lg'>{Obj.getLabel(object)}</h3>
        <p className='flex gap-2 items-center'>
          <span className='text-sm font-mono dx-text-hue' data-hue={getHashHue(object.id)}>
            {object.id.slice(-6)}
          </span>
          <span className='text-sm text-description bg-neutral-800 pli-2 plb-1 rounded'>{Obj.getTypename(object)}</span>
        </p>
      </div>
      <details className='group'>
        <summary className='cursor-pointer text-sm text-primary hover:text-primaryHover'>View JSON</summary>
        <pre className='mt-2 text-xs p-3 rounded overflow-x-auto'>{JSON.stringify(object, null, 2)}</pre>
      </details>
    </div>
  );
};
