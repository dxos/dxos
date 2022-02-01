//
// Copyright 2021 DXOS.org
//

import { ObjectId } from '../scene';

export type GraphNode = {
  data?: any
  initialized?: boolean
  id: ObjectId
  x?: number
  y?: number
  r?: number
}

export type GraphLink = {
  id: string
  source: GraphNode
  target: GraphNode
}

export type Graph = {
  nodes: GraphNode[]
  links: GraphLink[]
}
