//
// Copyright 2023 DXOS.org
//

import { Graph } from '@braneframe/plugin-graph';

// todo(thure): Remove `childrenManaged`, this is a temporary hack.
export type SharedTreeItemProps = { node: Graph.Node; level: number; childrenManaged?: boolean };

export type SharedTreeItemHeadingProps = {
  open?: boolean;
  active?: boolean;
  level: number;
  node: Graph.Node;
};
