//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useActiveSpace } from '@dxos/app-toolkit/ui';
import { Entity, Filter, Query } from '@dxos/echo';
import { type Space, useQuery } from '@dxos/react-client/echo';
import { Next } from '@dxos/react-ui/next';
import { getHashHue } from '@dxos/ui-theme';

import { ResearchInputQueue } from '../testing/schema.ts';

export const ResearchInputModule = () => {
  const space = useActiveSpace();
  if (!space) {
    return null;
  }

  return <ResearchInputModuleContainer space={space} />;
};

const ResearchInputModuleContainer = ({ space }: { space: Space }) => {
  const [researchInput] = useQuery(space.db, Filter.type(ResearchInputQueue));
  const feed = researchInput?.feed.target;
  const objects = useQuery(
    space.db,
    feed ? Query.select(Filter.everything()).from(feed) : Query.select(Filter.nothing()),
  );

  return (
    <Next.Panel.Root>
      <Next.Panel.Header>
        <Next.Toolbar.Root>
          <Next.Toolbar.Text>Research Input</Next.Toolbar.Text>
        </Next.Toolbar.Root>
      </Next.Panel.Header>
      <Next.Panel.Body asChild>
        <Next.ScrollArea.Root orientation='vertical'>
          <Next.ScrollArea.Viewport classNames='flex flex-col gap-4 p-4'>
            {objects.map((object) => (
              <DebugCard key={object.id} object={object} />
            ))}
          </Next.ScrollArea.Viewport>
        </Next.ScrollArea.Root>
      </Next.Panel.Body>
    </Next.Panel.Root>
  );
};

type DebugCardProps = {
  object: Entity.Unknown;
};

const DebugCard = ({ object }: DebugCardProps) => {
  return (
    <div className='border border-separator rounded-lg p-4 dx-base-surface'>
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
