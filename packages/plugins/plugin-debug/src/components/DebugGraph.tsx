//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { Tree } from '@dxos/devtools';
import { type Graph } from '@dxos/plugin-graph';

export const DebugGraph: FC<{ graph: Graph; root: string }> = ({ graph, root }) => {
  return <Tree data={graph.toJSON(root)} />;
};

export default DebugGraph;
