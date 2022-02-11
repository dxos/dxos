//
// Copyright 2021 DXOS.org
//

import { EventEmitter } from '@dxos/gem-core';

import { GraphData, GraphNode, GraphLink, emptyGraph } from './types';

/**
 * Graph accessor.
 */
export interface GraphModel<T> {
  get graph (): GraphData<T>
  subscribe? (callback: (graph: GraphData<T>) => void): () => void
}

/**
 * Utility to build GraphModel, which can be passed into the Graph component.
 */
export class GraphBuilder<T> implements GraphModel<T> {
  readonly updated = new EventEmitter<GraphData<T>>();

  constructor (
    private readonly _graph = emptyGraph
  ) {}

  get graph (): GraphData<T> {
    return this._graph;
  }

  clear () {
    this._graph.nodes = [];
    this._graph.links = [];
    this.update();
  }

  subscribe (callback: (graph: GraphData<T>) => void): () => void {
    return this.updated.on(callback);
  }

  /**
   * Trigger update.
   */
  update () {
    this.updated.emit(this._graph);
  }

  getNode (id: string): GraphNode<T> | undefined {
    return this._graph.nodes.find(node => node.id === id);
  }

  /**
   * Get links where the given node ID is the source or target.
   * @param id
   * @param source
   * @param target
   */
  getLinks (id: string, source = true, target = false): GraphLink<T>[] {
    return this._graph.links.filter(link => {
      if (source && link.source.id === id) {
        return true;
      }
      if (target && link.target.id === id) {
        return true;
      }

      return false;
    });
  }

  // TODO(burdon): Batch mode.

  addNode (node: GraphNode<T>, update = true) {
    this._graph.nodes.push(node);

    update && this.update();
    return this;
  }

  addLink (link: GraphLink<T>, update = true) {
    this._graph.links.push(link);

    update && this.update();
    return this;
  }

  createLink (source: GraphNode<T>, target: GraphNode<T>, update = true) {
    this._graph.links.push({
      id: `${source.id}-${target.id}`,
      source,
      target
    });

    update && this.update();
    return this;
  }
}
