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
      if (source && link.target.id === id) {
        return true;
      }
      if (target && link.source.id === id) {
        return true;
      }

      return false;
    });
  }

  // TODO(burdon): Implement batch mode.
  // TODO(burdon): Upsert nodes.

  addNode (node: GraphNode<T>) {
    this._graph.nodes.push(node);

    this.update();
    return this;
  }

  addLink (link: GraphLink<T>) {
    this._graph.links.push(link);

    this.update();
    return this;
  }

  createLink (source: GraphNode<T>, target: GraphNode<T>) {
    this._graph.links.push({
      id: `${source.id}-${target.id}`,
      source,
      target
    });

    this.update();
    return this;
  }
}
