//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { type Space } from '@dxos/client/echo';
import { createSvgContext, SVG, SVGContextProvider } from '@dxos/gem-core';

import { HierarchicalEdgeBundling, RadialTree, TidyTree } from './layout';
import { mapGraphToTreeData, type TreeNode } from './types';
import { SpaceGraphModel } from '../Graph';

// TODO(burdon): Create dge bundling graph using d3.hierarchy.
// https://observablehq.com/@d3/hierarchical-edge-bundling?intent=fork

type Renderer = (svg: SVGSVGElement, data: any, options: any) => void;

export type LayoutVariant = 'tidy' | 'radial' | 'edge';

// TODO(burdon): Remove slots?
export type TreeLayoutSlots = {
  node?: string;
  path?: string;
  text?: string;
};

export type TreeOptions = {
  label: (d: any) => string;

  slots?: TreeLayoutSlots;
  radius?: number;

  width: number;
  height: number;
  margin?: number;

  padding?: number;
  // Radius of nodes.
  r?: number;
};

export const defaultTreeLayoutSlots: TreeLayoutSlots = {
  node: 'fill-blue-600',
  path: 'fill-none stroke-blue-400 stroke-[0.5px]',
  text: 'stroke-[0.5px] stroke-neutral-700 text-xs', // TODO(burdon): Create box instead of halo.
};

const renderers = new Map<LayoutVariant, Renderer>([
  ['tidy', TidyTree],
  ['radial', RadialTree],
  ['edge', HierarchicalEdgeBundling],
]);

export type TreeComponentProps<N = unknown> = {
  space: Space;
  selected?: string;
  variant?: LayoutVariant;
  onNodeClick?: (node?: N) => void;
};

export const Tree = <N,>({ space, selected, variant = 'tidy', onNodeClick }: TreeComponentProps<N>) => {
  // TODO(burdon): Model isn't getting updated. Subscribe to changes on space (like Graph).
  const model = useMemo(() => (space ? new SpaceGraphModel().open(space, selected) : undefined), [space, selected]);
  const [data, setData] = useState<TreeNode>();
  useEffect(() => {
    return model?.subscribe(() => {
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
        // TODO(burdon): Type.
        label: (d: any) => d.label,
        width,
        height,
        radius,
        marginLeft: (width - radius * 2) / 2,
        marginRight: (width - radius * 2) / 2,
        marginTop: (height - radius * 2) / 2,
        marginBottom: (height - radius * 2) / 2,
        slots: defaultTreeLayoutSlots,
      };

      const renderer = renderers.get(variant);
      renderer?.(context.ref.current!, data, options);
    }
  }, [data, width, height]);

  // TODO(burdon): Provider should expand.
  return (
    <div ref={ref} className='flex grow overflow-hidden' onClick={() => onNodeClick?.()}>
      <SVGContextProvider context={context}>
        <SVG />
      </SVGContextProvider>
    </div>
  );
};
