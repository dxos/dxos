//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useRef, useState } from 'react';

import { type Space } from '@dxos/client/echo';
import { useAsyncState } from '@dxos/react-ui';
import { SVG, type SVGContext } from '@dxos/react-ui-graph';
import { SpaceGraphModel } from '@dxos/schema';

import { HierarchicalEdgeBundling, RadialTree, TidyTree } from './layout';
import { type TreeNode, mapGraphToTreeData } from './types';

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

// TODO(burdon): Label accessor.
export const Tree = <N,>({ space, selected, variant = 'tidy', onNodeClick }: TreeComponentProps<N>) => {
  const [model] = useAsyncState(async () => (space ? new SpaceGraphModel().open(space) : undefined), [space, selected]);

  const [tree, setTree] = useState<TreeNode>();
  useEffect(() => {
    return model?.subscribe(() => {
      const tree = mapGraphToTreeData(model);
      setTree(tree);
    }, true);
  }, [model]);

  const context = useRef<SVGContext>(null);

  useEffect(() => {
    if (context.current?.size) {
      const { width, height } = context.current.size;
      const size = Math.min(width, height);
      const radius = size * 0.4;
      const options = {
        // TODO(burdon): Type.
        label: (d: any) => d.label ?? d.id,
        width,
        height,
        radius,
        marginLeft: (width - radius * 2) / 2,
        marginRight: (width - radius * 2) / 2,
        marginTop: (height - radius * 2) / 2,
        marginBottom: (height - radius * 2) / 2,
        slots: defaultTreeLayoutSlots,
      };

      if (tree) {
        const renderer = renderers.get(variant);
        renderer?.(context.current!.svg, tree, options);
      }
    }
  }, [context.current, tree]);

  return (
    <div onClick={() => onNodeClick?.()}>
      <SVG.Root ref={context} />
    </div>
  );
};
