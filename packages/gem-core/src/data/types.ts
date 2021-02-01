//
// Copyright 2020 DXOS.org
//

// TODO(burdon): Migrate from echo-demo.
export interface NodeType {
  id: string;
  title: string;
}

export interface LinkType {
  id: string;
  source: string;
  target: string;
}

export interface GraphType {
  nodes: NodeType[];
  links: LinkType[];
}
