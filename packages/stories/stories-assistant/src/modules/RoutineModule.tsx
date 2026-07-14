//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Instructions } from '@dxos/compute';
import { Filter } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { Card, Panel, Toolbar } from '@dxos/react-ui';
import { type ModuleProps } from '@dxos/story-modules';

// No plugin renders a bare `Instructions` object as an Article (the routine article surface matches
// `Routine.Routine`, which only references Instructions), so render it via the generic card surface
// contributed by the PreviewPlugin.
export const RoutineModule = ({ space }: ModuleProps) => {
  const [instructions] = useQuery(space.db, Filter.type(Instructions.Instructions));
  if (!instructions) {
    return null;
  }

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Text>{instructions.name ?? 'Routine'}</Toolbar.Text>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content classNames='p-2 min-h-0'>
        <Card.Root>
          <Surface.Surface type={AppSurface.CardContent} limit={1} data={{ subject: instructions }} />
        </Card.Root>
      </Panel.Content>
    </Panel.Root>
  );
};
