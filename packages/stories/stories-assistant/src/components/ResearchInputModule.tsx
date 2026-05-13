//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Entity, Filter } from '@dxos/echo';
import { EchoId } from '@dxos/keys';
import { useQuery, useQueue } from '@dxos/react-client/echo';
import { getHashHue } from '@dxos/ui-theme';

import { ResearchInputQueue } from '../testing';

import { type ComponentProps } from './types';

export const ResearchInputModule = ({ space }: ComponentProps) => {
  const [researchInput] = useQuery(space.db, Filter.type(ResearchInputQueue));
  const legacyDxn = researchInput?.queue.dxn;
  const queueEchoId = useMemo(() => {
    if (!legacyDxn) return undefined;
    const echoDxn = legacyDxn.asEchoDXN();
    return echoDxn?.spaceId && echoDxn?.echoId
      ? EchoId.fromSpaceAndObjectId(echoDxn.spaceId, echoDxn.echoId as any)
      : undefined;
  }, [legacyDxn]);
  const queue = useQueue(queueEchoId);

  return (
    <ul className='flex flex-col gap-4 p-4 h-full overflow-y-auto'>
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
        <h3 className='font-medium text-lg'>{Entity.getLabel(object)}</h3>
        <p className='flex gap-2 items-center'>
          <span className='text-sm font-mono dx-text' data-hue={getHashHue(object.id)}>
            {object.id.slice(-6)}
          </span>
          <span className='text-sm text-description bg-neutral-800 px-2 py-1 rounded-sm'>
            {Entity.getTypename(object)}
          </span>
        </p>
      </div>
      <details className='group'>
        <summary className='cursor-pointer text-sm text-accent-text hover:text-accent-text-hover'>View JSON</summary>
        <pre className='mt-2 text-xs p-3 rounded-sm overflow-x-auto'>{JSON.stringify(object, null, 2)}</pre>
      </details>
    </div>
  );
};
