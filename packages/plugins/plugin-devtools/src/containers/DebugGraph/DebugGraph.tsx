//
// Copyright 2023 DXOS.org
//

import React from 'react';

import * as AppGraph from '@dxos/app-graph/AppGraph';
import { Tree } from '@dxos/devtools';
import { Next } from '@dxos/react-ui';

export type DebugGraphProps = { role?: string; graph: AppGraph.Graph; root: string };

export const DebugGraph = ({ role, graph, root }: DebugGraphProps) => {
  return (
    <Next.Panel.Root role={role}>
      <Next.Panel.Body asChild>
        <Next.ScrollArea.Root orientation='all'>
          <Next.ScrollArea.Viewport>
            <Tree data={AppGraph.toJSON(graph, root)} />
          </Next.ScrollArea.Viewport>
        </Next.ScrollArea.Root>
      </Next.Panel.Body>
    </Next.Panel.Root>
  );
};

DebugGraph.displayName = 'DebugGraph';
