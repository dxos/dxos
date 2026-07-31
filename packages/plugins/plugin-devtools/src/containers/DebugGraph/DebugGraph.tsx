//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Tree } from '@dxos/devtools';
import { Graph } from '@dxos/plugin-graph';
import { Panel, ScrollArea } from '@dxos/react-ui';

export type DebugGraphProps = { graph: Graph.Graph; root: string };

export const DebugGraph = ({ graph, root }: DebugGraphProps) => {
  return (
    <Panel.Root>
      <Panel.Content asChild>
        <ScrollArea.Root orientation='all'>
          <ScrollArea.Viewport>
            <Tree data={Graph.toJSON(graph, root)} />
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};

DebugGraph.displayName = 'DebugGraph';
