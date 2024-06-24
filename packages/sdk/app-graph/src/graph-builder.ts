//
// Copyright 2023 DXOS.org
//

import { effect } from '@preact/signals-core';

import { EventSubscriptions } from '@dxos/async';

import { Graph } from './graph';
import { type Node, type EdgeDirection, type NodeArg } from './node';

export type ConnectorExtension = (node: Node, direction: EdgeDirection, type?: string) => NodeArg<any>[];
export type HydratorExtension = (id: string, type: string) => NodeArg<any>;

export type ExtensionType = 'connector' | 'hydrator';
export type BuilderExtension =
  | {
      type: 'connector';
      extension: ConnectorExtension;
    }
  | {
      type: 'hydrator';
      extension: HydratorExtension;
    };

export const connector = (extension: ConnectorExtension): BuilderExtension => ({ type: 'connector', extension });
export const hydrator = (extension: HydratorExtension): BuilderExtension => ({ type: 'hydrator', extension });

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

    const graph: Graph =
      previousGraph ??
      new Graph({
        onInitialNode: (id, type) => {
          const extensions = Array.from(this._extensions.values())
            .filter((extension) => extension.type === 'hydrator')
            .map(({ extension }) => extension) as HydratorExtension[];

          return extensions.reduce(
            (node, extension) => {
              if (node) {
                return node;
              } else {
                return extension(id, type);
              }
            },
            undefined as NodeArg<any> | undefined,
          );
        },
        onInitialNodes: (node, direction, type) => {
          let initial: NodeArg<any>[];
          this._unsubscribe.add(
            effect(() => {
              const extensions = Array.from(this._extensions.values())
                .filter((extension) => extension.type === 'connector')
                .map(({ extension }) => extension) as ConnectorExtension[];
              const nodes = extensions
                .flatMap((extension) => extension(node, direction, type))
                .filter((n) => !type || n.type === type);
              if (initial) {
                graph._addNodes(...nodes);
              } else {
                initial = nodes;
              }
            }),
          );

          return initial!;
        },
      });

    return graph;
  }

  destroy() {
    this._unsubscribe.clear();
  }
}
