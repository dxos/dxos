//
// Copyright 2023 DXOS.org
//

import { Graph, useGraph } from '@braneframe/plugin-graph';
import { useMosaic } from '@dxos/aurora-grid';

export const getLevel = (node: Graph.Node, level = 0): number => {
  if (!node.parent) {
    return level;
  } else {
    return getLevel(node.parent, level + 1);
  }
};

export const useGraphMosaic = () => {
  const { graph } = useGraph();
  const {
    mosaic: { tiles, relations },
  } = useMosaic();
};
