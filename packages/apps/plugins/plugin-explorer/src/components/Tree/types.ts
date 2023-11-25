//
// Copyright 2023 DXOS.org
//

import type { GraphModel } from '@dxos/gem-spore';

export type TreeNode = {
  id: string;
  label: string;
  children?: TreeNode[];
};

export const mapGraphToTreeData = <N>(model: GraphModel<N>, maxDepth = 8): TreeNode | undefined => {
  const mapNode = (node: N, depth = 0): TreeNode => {
    const treeNode: TreeNode = {
      id: model.idAccessor(node),
      label: model.idAccessor(node).slice(0, 8),
    };

    const links = model.graph.links.filter((link) => link.source === treeNode.id);
    if (depth < maxDepth) {
      treeNode.children = links.map((link) =>
        mapNode(model.graph.nodes.find((node) => model.idAccessor(node) === link.target)!, depth + 1),
      );
    }

    return treeNode;
  };

  let data: TreeNode | undefined;
  if (model.selected) {
    const node = model.graph.nodes.find((node) => model.idAccessor(node) === model.selected);
    if (node) {
      data = mapNode(node);
    }
  }

  return data;
};
