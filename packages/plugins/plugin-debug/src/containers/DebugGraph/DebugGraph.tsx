//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Tree } from '@dxos/devtools';
import { Graph } from '@dxos/plugin-graph';

export type DebugGraphProps = { graph: Graph.Graph; root: string };

export const DebugGraph = ({ graph, root }: DebugGraphProps) => {
  return <Tree data={Graph.toJSON(graph, root)} />;
};
