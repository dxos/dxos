//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { GraphModel } from '@dxos/gem-spore';

import { Tree } from './Tree';

// TODO(burdon): Define EchoNode.
export type TreeNode = {
  id: string;
  label: string;
  children?: TreeNode[];
};

export const mapGraphToTreeData = <N,>(model: GraphModel<N>): TreeNode | undefined => {
  // TODO(burdon): Handle recursion/depth.
  const mapNode = (node: N): TreeNode => {
    const treeNode: TreeNode = {
      id: model.idAccessor(node),
      label: model.idAccessor(node).slice(0, 8) // TODO(burdon): ???
    };

    const links = model.graph.links.filter((link) => link.source === treeNode.id);
    treeNode.children = links.map((link) =>
      mapNode(model.graph.nodes.find((node) => model.idAccessor(node) === link.target)!)
    );

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
};

export const TreeComponent = <N,>({ model }: TreeComponentProps<N>) => {
  const { ref, width = 0, height = 0 } = useResizeDetector();
  const [data, setData] = useState<TreeNode>();

  useEffect(() => {
    const subscription = model.subscribe(() => setData(mapGraphToTreeData(model)));
    model.triggerUpdate();
    return subscription;
  }, [model]);

  const size = Math.min(width, height);
  const radius = size / 2;
  const options = {
    width,
    height,
    radius,
    marginLeft: (width - radius * 2) / 2,
    marginRight: (width - radius * 2) / 2,
    label: (d: any) => d.label
  };

  // TODO(burdon): Update Tree when data changes.
  useEffect(() => {
    if (width && height) {
      if (!ref.current.children.length) {
        const el = Tree(data ?? {}, options as any);
        ref.current.append(el);
      }
    }
  }, [width, height]);

  // TODO(burdon): Share parent SVG.
  return <div ref={ref} className='flex flex-1 scroll-auto' />;
};
