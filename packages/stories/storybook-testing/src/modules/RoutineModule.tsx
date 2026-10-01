//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface, useActiveSpace } from '@dxos/app-toolkit/ui';
import * as Instructions from '@dxos/compute/Instructions';
import { Filter } from '@dxos/echo';
import { type Space, useQuery } from '@dxos/react-client/echo';
import { Next } from '@dxos/react-ui/next';

// No plugin renders a bare `Instructions` object as an Article (the routine article surface matches
// `Routine.Routine`, which only references Instructions), so render it via the generic card surface
// contributed by the PreviewPlugin.
export const RoutineModule = () => {
  const space = useActiveSpace();
  if (!space) {
    return null;
  }

  return <RoutineModuleContainer space={space} />;
};

const RoutineModuleContainer = ({ space }: { space: Space }) => {
  const [instructions] = useQuery(space.db, Filter.type(Instructions.Instructions));
  if (!instructions) {
    return null;
  }

  return (
    <Next.Panel.Root>
      <Next.Panel.Header>
        <Next.Toolbar.Root>
          <Next.Toolbar.Text>{instructions.name ?? 'Routine'}</Next.Toolbar.Text>
        </Next.Toolbar.Root>
      </Next.Panel.Header>
      <Next.Panel.Body classNames='p-2 min-h-0'>
        <Next.Card.Root>
          <Surface.Surface type={AppSurface.CardContent} limit={1} data={{ subject: instructions }} />
        </Next.Card.Root>
      </Next.Panel.Body>
    </Next.Panel.Root>
  );
};
