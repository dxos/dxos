//
// Copyright 2020 DXOS.org
//

export interface Node {
  id: string,
  type: string,
  title: string
  partyKey?: string
}

export interface Link {
  id: string,
  source: string | Node,
  target: string | Node
}

// TODO(burdon): Move to @dxos/gem.
export interface GraphData {
  nodes: Node[],
  links: Link[]
}
