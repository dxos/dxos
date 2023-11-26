//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { createSvgContext, SVG, SVGContextProvider } from '@dxos/gem-core';
import { type GraphModel } from '@dxos/gem-spore';

import { HierarchicalEdgeBundling, RadialTree, TidyTree } from './layout';
import { mapGraphToTreeData, type TreeNode } from './types';

// TODO(burdon): Create dge bundling graph using d3.hierarchy.
// https://observablehq.com/@d3/hierarchical-edge-bundling?intent=fork

type Renderer = (svg: SVGSVGElement, data: any, options: any) => void;

export type LayoutType = 'dendrogram' | 'radial' | 'edge';

const renderers = new Map<LayoutType, Renderer>([
  ['dendrogram', TidyTree],
  ['radial', RadialTree],
  ['edge', HierarchicalEdgeBundling],
]);

export type TreeComponentProps<N = unknown> = {
  model: GraphModel<N>;
  type?: LayoutType;
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

  const context = createSvgContext();
  const { ref, width = 0, height = 0 } = useResizeDetector();

  useEffect(() => {
    if (width && height) {
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

      const renderer = renderers.get(type);
      renderer?.(context.ref.current!, data, options);
    }
  }, [data, width, height]);

  // TODO(burdon): Provider should expand.
  return (
    <div ref={ref} className='flex grow overflow-hidden'>
      <SVGContextProvider context={context}>
        <SVG />
      </SVGContextProvider>
    </div>
  );
};
