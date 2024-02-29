//
// Copyright 2023 DXOS.org
//

import { EventSubscriptions, type UnsubscribeCallback } from '@dxos/async';

import { Graph } from './graph';

export type BuilderExtension = (graph: Graph) => UnsubscribeCallback | void;

/**
 * The builder provides an extensible way to compose the construction of the graph.
 */
export class GraphBuilder {
  private readonly _extensions = new Map<string, BuilderExtension>();
  private readonly _unsubscribe = new EventSubscriptions();

  /**
   * Register a node builder which will be called in order to construct the graph.
   */
  addExtension(id: string, extension: BuilderExtension): GraphBuilder {
    this._extensions.set(id, extension);
    return this;
  }

  /**
   * Remove a node builder from the graph builder.
   */
  removeExtension(id: string): GraphBuilder {
    this._extensions.delete(id);
    return this;
  }

  /**
   * Construct the graph, starting by calling all registered extensions.
   * @param previousGraph If provided, the graph will be updated in place.
   */
  build(previousGraph?: Graph): Graph {
    // Clear previous extension subscriptions.
    this._unsubscribe.clear();

    const graph: Graph = previousGraph ?? new Graph();

    Array.from(this._extensions.values()).forEach((builder) => {
      const unsubscribe = builder(graph);
      unsubscribe && this._unsubscribe.add(unsubscribe);
    });

    return graph;
  }
}
