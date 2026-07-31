//
// Copyright 2023 DXOS.org
//

/**
 * In-memory tree shape consumed by the d3 layouts. `data` carries through to layout callbacks
 * (hover / inspect / per-node styling) — typically a domain object on leaves.
 */
export type TreeNode<TData = unknown> = {
  id: string;
  label?: string;
  data?: TData;
  children?: TreeNode<TData>[];
};
