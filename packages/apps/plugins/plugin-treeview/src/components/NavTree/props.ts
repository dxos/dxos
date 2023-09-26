//
// Copyright 2023 DXOS.org
//

import { Node } from '@braneframe/plugin-graph';

export type SharedTreeItemProps = { node: Node; level: number };

export type SharedTreeItemHeadingProps = {
  open?: boolean;
  active?: boolean;
  level: number;
  node: Node;
};
