//
// Copyright 2020 DXOS.org
//

export type TestNode = {
  id: string
  type?: string
  label: string
  children?: TestNode[]
}

export type LinkType = {
  id: string
  source: string
  target: string
}

export type TestGraph = {
  nodes: TestNode[]
  links: LinkType[]
}

export const emptyTestGraph = {
  nodes: [],
  links: []
};
