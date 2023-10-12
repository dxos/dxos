//
// Copyright 2023 DXOS.org
//

import { UniqueIdentifier } from '@dnd-kit/core';
import { getIndexAbove, getIndexBelow, getIndexBetween } from '@tldraw/indices';

import { Node } from '@braneframe/plugin-graph';

export const nextRearrangeIndex = (nodes: Node[], activeId: UniqueIdentifier, overId?: UniqueIdentifier) => {
  const overOrderIndex = nodes.length > 0 ? nodes.findIndex(({ id }) => id === overId) : -1;
  if (overOrderIndex >= 0) {
    const activeOrderIndex = nodes.findIndex(({ id }) => id === activeId);
    return overOrderIndex < 1
      ? getIndexBelow(nodes[overOrderIndex].properties.index)
      : activeOrderIndex < overOrderIndex
      ? getIndexBetween(nodes[overOrderIndex].properties.index, nodes[overOrderIndex + 1]?.properties.index)
      : getIndexBetween(nodes[overOrderIndex - 1].properties.index, nodes[overOrderIndex].properties.index);
  } else {
    return null;
  }
};

export const nextCopyIndex = (nodes: Node[], overId?: UniqueIdentifier) => {
  const overOrderIndex = nodes.length > 0 ? nodes.findIndex(({ id }) => id === overId) : -1;
  const previewOrderIndex = nodes.findIndex(({ id }) => id.startsWith('preview--'));
  if (overOrderIndex >= 0) {
    return overOrderIndex < 1
      ? getIndexBelow(nodes[overOrderIndex].properties.index)
      : previewOrderIndex < overOrderIndex && previewOrderIndex >= 0
      ? getIndexBetween(nodes[overOrderIndex].properties.index, nodes[overOrderIndex + 1]?.properties.index)
      : getIndexBetween(nodes[overOrderIndex - 1].properties.index, nodes[overOrderIndex]?.properties.index);
  } else {
    return nodes.length ? getIndexAbove(nodes[nodes.length - 1].properties.index) : 'a0';
  }
};
