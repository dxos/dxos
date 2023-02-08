//
// Copyright 2021 DXOS.org
//

import { EventEmitter } from '@dxos/gem-core';

import { defaultIdAccessor, emptyGraph, GraphData, GraphLink } from '../graph';

/**
 * Utility to build GraphModel, which can be passed into the Graph component.
 */
export class GraphBuilder<N> {
  readonly updated = new EventEmitter<GraphData<N>>();

  // prettier-ignore
  constructor(
    private readonly _idAccessor = defaultIdAccessor,
    private readonly _graph = emptyGraph
  ) {}

  get graph(): GraphData<N> {
    return this._graph;
  }

  clear() {
    this._graph.nodes = [];
    this._graph.links = [];
    this.update();
  }

  subscribe(callback: (graph: GraphData<N>) => void): () => void {
    return this.updated.on(callback);
  }

  /**
   * Trigger update.
   */
  update() {
    this.updated.emit(this._graph);
  }

  getNode(id: string): N | undefined {
    return this._graph.nodes.find((node) => node.id === id);
  }

  /**
   * Get links where the given node ID is the source or target.
   * @param id
   * @param source
   * @param target
   */
  getLinks(id: string, source = true, target = false): GraphLink[] {
    return this._graph.links.filter((link) => {
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

  addNode(node: N, update = true) {
    this._graph.nodes.push(node);

    update && this.update();
    return this;
  }

  addLink(link: GraphLink, update = true) {
    this._graph.links.push(link);

    update && this.update();
    return this;
  }

  createLink(source: N, target: N, update = true) {
    this._graph.links.push({
      id: `${this._idAccessor(source)}-${this._idAccessor(target)}`,
      source: this._idAccessor(source),
      target: this._idAccessor(target)
    });

    update && this.update();
    return this;
  }
}
