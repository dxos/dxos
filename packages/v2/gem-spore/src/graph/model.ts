//
// Copyright 2021 DXOS.org
//

import { EventEmitter } from '@dxos/gem-core';

import { emptyGraph, GraphData, GraphNode, GraphLink } from './types';

/**
 * Graph accessor.
 */
export interface GraphModel<T extends GraphNode> {
  get graph (): GraphData<T>
  subscribe (callback: (graph: GraphData<T>) => void): () => void
}

/**
 * Utility to build GraphModel, which can be passed into the Graph component.
 */
export class GraphBuilder<T extends GraphNode> {
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

  getNode (id: string): GraphNode | undefined {
    return this._graph.nodes.find(node => node.id === id);
  }

  /**
   * Get links where the given node ID is the source or target.
   * @param id
   * @param source
   * @param target
   */
  getLinks (id: string, source = true, target = false): GraphLink[] {
    return this._graph.links.filter(link => {
      if (source && link.source === id) {
        return true;
      }
      if (target && link.target === id) {
        return true;
      }

      return false;
    });
  }

  // TODO(burdon): Batch mode.

  addNode (node: GraphNode, update = true) {
    this._graph.nodes.push(node);

    update && this.update();
    return this;
  }

  addLink (link: GraphLink, update = true) {
    this._graph.links.push(link);

    update && this.update();
    return this;
  }

  createLink (source: GraphNode, target: GraphNode, update = true) {
    this._graph.links.push({
      id: `${source.id}-${target.id}`,
      source: source.id,
      target: target.id
    });

    update && this.update();
    return this;
  }
}
