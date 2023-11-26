//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { type GraphModel } from '@dxos/gem-spore';

import { RadialTree, TidyTree } from './layout';
import { mapGraphToTreeData, type TreeNode } from './types';

// TODO(burdon): Create dge bundling graph using d3.hierarchy.
// https://observablehq.com/@d3/hierarchical-edge-bundling?intent=fork

type Renderer = (props: { data: any; options: any }) => SVGElement;

const renderers: { [type: string]: Renderer } = {
  dendrogram: TidyTree,
  radial: RadialTree,
};

export type TreeComponentProps<N> = {
  model: GraphModel<N>;
  type?: 'dendrogram' | 'radial';
  onClick?: (node?: N) => void;
};

// TODO(burdon): Pass in TypedObject.
export const Tree = <N,>({ model, type = 'radial', onClick }: TreeComponentProps<N>) => {
  const [data, setData] = useState<TreeNode>();
  useEffect(() => {
    return model.subscribe(() => {
      const tree = mapGraphToTreeData(model);
      setData(tree);
    }, true);
  }, [model]);

  const { ref, width = 0, height = 0 } = useResizeDetector();
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
    label: (d: any) => d.label,
  };

  useEffect(() => {
    if (width && height) {
      ref.current.firstChild?.remove();
      ref.current.append(renderers[type]({ data, options }));
    }
  }, [data, width, height]);

  return <div ref={ref} className='flex grow overflow-hidden' onClick={() => onClick?.()} />;
};
