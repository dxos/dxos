//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { GraphModel } from '@dxos/gem-spore';

import { RadialTree } from './RadialTree';
import { TidyTree } from './TidyTree';

export enum TreeType {
  DENDROGRAM = 0,
  RADIAL = 1
}

// TODO(burdon): Define EchoNode.
export type TreeNode = {
  id: string;
  label: string;
  children?: TreeNode[];
};

export const mapGraphToTreeData = <N,>(model: GraphModel<N>, maxDepth = 5): TreeNode | undefined => {
  // TODO(burdon): Handle recursion/depth.
  const mapNode = (node: N, depth = 0): TreeNode => {
    const treeNode: TreeNode = {
      id: model.idAccessor(node),
      label: model.idAccessor(node).slice(0, 8) // TODO(burdon): ???
    };

    const links = model.graph.links.filter((link) => link.source === treeNode.id);
    if (depth < maxDepth) {
      treeNode.children = links.map((link) =>
        mapNode(model.graph.nodes.find((node) => model.idAccessor(node) === link.target)!, depth + 1)
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

export type TreeComponentProps<N> = {
  model: GraphModel<N>;
  type: TreeType;
};

export const TreeComponent = <N,>({ model, type = TreeType.RADIAL }: TreeComponentProps<N>) => {
  const { ref, width = 0, height = 0 } = useResizeDetector();
  const [data, setData] = useState<TreeNode>();

  useEffect(() => {
    const subscription = model.subscribe(() => setData(mapGraphToTreeData(model)));
    model.triggerUpdate();
    return subscription;
  }, [model]);

  const size = Math.min(width, height);
  const radius = size * 0.4;
  const options = {
    width,
    height,
    radius,
    marginLeft: (width - radius * 2) / 2,
    marginRight: (width - radius * 2) / 2,
    marginTop: (height - radius * 2) / 2,
    marginBottom: (height - radius * 2) / 2,
    label: (d: any) => d.label
  };

  // TODO(burdon): Update Tree when data changes.
  useEffect(() => {
    if (width && height) {
      if (!ref.current.children.length) {
        let el;
        // TODO(burdon): Map.
        switch (type) {
          case TreeType.DENDROGRAM: {
            el = TidyTree(data ?? {}, options as any);
            break;
          }
          case TreeType.RADIAL: {
            el = RadialTree(data ?? {}, options as any);
            break;
          }
        }

        if (el) {
          ref.current.append(el);
        }
      }
    }
  }, [width, height]);

  // TODO(burdon): Share parent SVG.
  return <div ref={ref} className='flex flex-1 scroll-auto' />;
};
