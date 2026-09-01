//
// Copyright 2024 DXOS.org
//

import { type TreeNodeData } from './Tree.tsx';

// Kept out of `Tree.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on
// every edit.

export const visitNodes = <T>(
  node: TreeNodeData,
  callback: (node: TreeNodeData, depth: number) => T,
  depth = 0,
): T | undefined => {
  const result = callback(node, depth);
  if (result) {
    return result;
  }

  for (const child of node.children ?? []) {
    const result = visitNodes(child, callback, depth + 1);
    if (result) {
      return result;
    }
  }
};
