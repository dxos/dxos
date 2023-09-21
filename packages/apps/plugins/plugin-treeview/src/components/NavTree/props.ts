//
// Copyright 2023 DXOS.org
//

import { Graph } from '@braneframe/plugin-graph';

export type SharedTreeItemProps = { node: Graph.Node; level: number };

export type SharedTreeItemHeadingProps = {
  open?: boolean;
  active?: boolean;
  level: number;
  node: Graph.Node;
};
