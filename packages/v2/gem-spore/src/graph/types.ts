//
// Copyright 2021 DXOS.org
//

// Types used with D3 force.

export type GraphNode<T> = {
  id: string
  data?: T
  x?: number
  y?: number
  r?: number
  children?: number
  initialized?: boolean
}

export type GraphLink<T> = {
  id: string
  source: GraphNode<T>
  target: GraphNode<T>
}

export type GraphData<T> = {
  nodes: GraphNode<T>[]
  links: GraphLink<T>[]
}

/**
 * Graph accessor.
 */
export interface GraphModel<T> {
  get graph (): GraphData<T>
  subscribe? (callback: (graph: GraphData<T>) => void): () => void
}

export const emptyGraph = {
  nodes: [],
  links: []
};
