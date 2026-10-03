//
// Copyright 2025 DXOS.org
//

import React from 'react';

import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as Hooks from '@dxos/app-toolkit/Hooks';
import * as Instructions from '@dxos/compute/Instructions';
import { Filter } from '@dxos/echo';
import { type Space, useQuery } from '@dxos/react-client/echo';
import { Card, Panel, Toolbar } from '@dxos/react-ui';

// No plugin renders a bare `Instructions` object as an Article (the routine article surface matches
// `Routine.Routine`, which only references Instructions), so render it via the generic card surface
// contributed by the PreviewPlugin.
export const RoutineModule = () => {
  const space = Hooks.useActiveSpace();
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
    <Panel.Root>
      <Panel.Header>
        <Toolbar.Root>
          <Toolbar.Text>{instructions.name ?? 'Routine'}</Toolbar.Text>
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body classNames='p-2 min-h-0'>
        <Card.Root>
          <Surface.Surface type={AppSurface.CardContent} limit={1} data={{ subject: instructions }} />
        </Card.Root>
      </Panel.Body>
    </Panel.Root>
  );
};
