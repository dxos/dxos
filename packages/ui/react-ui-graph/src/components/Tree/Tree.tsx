//
// Copyright 2023 DXOS.org
//

import React, { useMemo } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';

import { type BundleEdge, HierarchicalEdgeBundling, RadialTree, TidyTree, type TreeLayoutSlots } from './layout';
import { type TreeNode } from './types';

export type LayoutVariant = 'tidy' | 'radial' | 'edge';

export type TreeComponentProps = ThemedClassName<{
  data: TreeNode;
  /** Optional edges for the `edge` variant (hierarchical edge bundling). */
  edges?: BundleEdge[];
  variant?: LayoutVariant;
  label?: (node: TreeNode) => string;
  slots?: TreeLayoutSlots;
  /** Margin in screen pixels reserved around the layout (forwarded to the `tidy` layout). */
  margin?: number;
  initialCollapsed?: Iterable<string>;
  onNodeClick?: (node: TreeNode) => void;
  onNodeHover?: (node: TreeNode | null, event?: MouseEvent) => void;
}>;

/**
 * Tree visualization wrapping the three layout variants.
 * - `tidy`   — horizontal tidy tree (collapsible)
 * - `radial` — radial tree         (collapsible)
 * - `edge`   — hierarchical edge bundling (`edges` connect leaves)
 */
export const Tree = ({
  classNames,
  data,
  edges,
  variant = 'tidy',
  label,
  slots,
  margin,
  initialCollapsed,
  onNodeClick,
  onNodeHover,
}: TreeComponentProps) => {
  return useMemo(() => {
    switch (variant) {
      case 'tidy':
        return (
          <TidyTree
            classNames={classNames}
            data={data}
            label={label}
            slots={slots}
            margin={margin}
            initialCollapsed={initialCollapsed}
            onNodeClick={onNodeClick}
          />
        );
      case 'radial':
        return (
          <RadialTree
            classNames={classNames}
            data={data}
            label={label}
            slots={slots}
            initialCollapsed={initialCollapsed}
            onNodeClick={onNodeClick}
            onNodeHover={onNodeHover}
          />
        );
      case 'edge':
        return (
          <HierarchicalEdgeBundling
            classNames={classNames}
            data={data}
            edges={edges ?? []}
            label={label}
            slots={slots}
            onNodeHover={onNodeHover}
          />
        );
    }
  }, [variant, classNames, data, edges, label, slots, initialCollapsed, onNodeClick, onNodeHover]);
};
