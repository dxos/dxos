import React from 'react';
import { Filter, Obj } from '@dxos/echo';
import { useQuery, useQueue } from '@dxos/react-client/echo';
import { ResearchInputQueue } from '../testing';
import type { ComponentProps } from './types';

export const ResearchInputStack = ({ space }: ComponentProps) => {
  const [researchInput] = useQuery(space, Filter.type(ResearchInputQueue));
  const queue = useQueue(researchInput?.queue.dxn);

  return (
    <div className='p-4 overflow-y-auto h-full'>
      <ul className='space-y-4 '>
        {queue?.objects.map((object) => (
          <li key={object.id} className='border border-separator rounded-lg p-4 bg-surface'>
            <div className='flex items-center justify-between mb-2'>
              <h3 className='font-medium text-lg'>{Obj.getLabel(object)}</h3>
              <p className='flex gap-2 items-center'>
                <span className='text-sm text-description font-mono'>#{object.id.slice(-6)}</span>
                <span className='text-sm text-description bg-neutral-800 px-2 py-1 rounded'>
                  {Obj.getTypename(object)}
                </span>
              </p>
            </div>
            <details className='group'>
              <summary className='cursor-pointer text-sm text-primary hover:text-primaryHover'>View JSON</summary>
              <pre className='mt-2 text-xs p-3 rounded overflow-x-auto'>{JSON.stringify(object, null, 2)}</pre>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
};
