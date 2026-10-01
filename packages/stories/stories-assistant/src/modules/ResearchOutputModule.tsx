//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface, useActiveSpace } from '@dxos/app-toolkit/ui';
import { Filter, Query } from '@dxos/echo';
import { type Space, useQuery } from '@dxos/react-client/echo';
import { Next } from '@dxos/react-ui/next';

import { ResearchInputQueue } from '../testing/schema.ts';

export const ResearchOutputModule = () => {
  const space = useActiveSpace();
  if (!space) {
    return null;
  }

  return <ResearchOutputModuleContainer space={space} />;
};

const ResearchOutputModuleContainer = ({ space }: { space: Space }) => {
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
          <Next.Toolbar.Text>Research Output</Next.Toolbar.Text>
        </Next.Toolbar.Root>
      </Next.Panel.Header>
      <Next.Panel.Body asChild>
        <Next.ScrollArea.Root orientation='vertical'>
          <Next.ScrollArea.Viewport classNames='flex flex-col gap-4 p-4'>
            {objects.map((object) => (
              <Next.Card.Root key={object.id}>
                <Surface.Surface type={AppSurface.CardContent} data={{ subject: object }} limit={1} />
              </Next.Card.Root>
            ))}
          </Next.ScrollArea.Viewport>
        </Next.ScrollArea.Root>
      </Next.Panel.Body>
    </Next.Panel.Root>
  );
};
