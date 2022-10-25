//
// Copyright 2020 DXOS.org
//

import { GraphNode } from '../graph';

export interface TestNode extends GraphNode {
  id: string;
  type?: string;
  label: string;
  children?: TestNode[];
}
