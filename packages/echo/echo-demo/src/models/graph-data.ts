//
// Copyright 2020 DXOS.org
//

import { PublicKey } from '@dxos/crypto';

export interface Node {
  id: string,
  type: string,
  title: string
  partyKey?: PublicKey | null
}

export interface Link {
  id: string,
  source: string | PublicKey | Node,
  target: string | PublicKey | Node
}

// TODO(burdon): Move to @dxos/gem.
export interface GraphData {
  nodes: Node[],
  links: Link[]
}
