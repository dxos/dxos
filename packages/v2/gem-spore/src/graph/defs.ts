//
// Copyright 2021 DXOS.org
//

import { ObjectId } from '../scene';

export type GraphNode<T> = {
  data?: T
  initialized?: boolean
  id: ObjectId
  x?: number
  y?: number
  r?: number
  children?: number
}

export type GraphLink = {
  id: string
  source: GraphNode<any>
  target: GraphNode<any>
}

export type Graph = {
  nodes: GraphNode<any>[]
  links: GraphLink[]
}
