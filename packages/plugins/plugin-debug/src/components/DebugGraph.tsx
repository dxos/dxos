//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { Tree } from '@dxos/devtools';
import { Graph } from '@dxos/plugin-graph';

export type DebugGraphProps = { graph: Graph.Graph; root: string };
export const DebugGraph: FC<DebugGraphProps> = ({ graph, root }) => {
  return <Tree data={Graph.toJSON(graph, root)} />;
};

export default DebugGraph;
