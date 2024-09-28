//
// Copyright 2024 DXOS.org
//

import { useContext, useEffect, useState } from 'react';

import { raise } from '@dxos/debug';
import { type Space } from '@dxos/react-client/echo';

import { ComputeGraphContext } from '../components';
import { type ComputeGraph } from '../graph';

/**
 * Get existing or create new compute graph for the given space.
 */
export const useComputeGraph = (space?: Space): ComputeGraph | undefined => {
  const { registry } = useContext(ComputeGraphContext) ?? raise(new Error('Missing ComputeGraphContext'));
  const [graph, setGraph] = useState<ComputeGraph | undefined>(space && registry.getGraph(space.id));
  useEffect(() => {
    if (graph || !space) {
      return;
    }

    const t = setTimeout(async () => {
      let graph = registry.getGraph(space.id);
      if (!graph) {
        graph = await registry.createGraph(space);
      }
      setGraph(graph);
    });

    return () => clearTimeout(t);
  }, [space, graph]);

  return graph;
};
