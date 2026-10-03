//
// Copyright 2023 DXOS.org
//

import React from 'react';

import * as AppGraph from '@dxos/app-graph/AppGraph';
import { Tree } from '@dxos/devtools';
import { Panel, ScrollArea } from '@dxos/react-ui';

export type DebugGraphProps = { role?: string; graph: AppGraph.Graph; root: string };

export const DebugGraph = ({ role, graph, root }: DebugGraphProps) => {
  return (
    <Panel.Root role={role}>
      <Panel.Content asChild>
        <ScrollArea.Root orientation='all'>
          <ScrollArea.Viewport>
            <Tree data={AppGraph.toJSON(graph, root)} />
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};

DebugGraph.displayName = 'DebugGraph';
