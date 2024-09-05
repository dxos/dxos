//
// Copyright 2024 DXOS.org
//

import { useEffect } from 'react';

import { ACTION_GROUP_TYPE, ACTION_TYPE, getGraph, type Node } from '@dxos/plugin-graph';

const expandNodeActions = async (node: Node) => {
  const graph = getGraph(node);
  await graph.expand(node, 'outbound', ACTION_GROUP_TYPE);
  await graph.expand(node, 'outbound', ACTION_TYPE);
};

export const useNodeActionExpander = (node?: Node) => {
  useEffect(() => {
    if (node) {
      const frame = requestAnimationFrame(() => {
        void expandNodeActions(node);
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [node]);
};
