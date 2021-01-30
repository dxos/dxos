//
// Copyright 2020 DXOS.org
//

// TODO(burdon): Migrate from echo-demo.
export interface Node {
  id: string;
  title: string;
}

export interface Link {
  id: string;
  source: string;
  target: string;
}

export interface Graph {
  nodes: Node[];
  links: Link[];
}
