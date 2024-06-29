//
// Copyright 2023 DXOS.org
//

import { type Signal, effect, signal } from '@preact/signals-core';
// import { yieldOrContinue } from 'main-thread-scheduling';

import { EventSubscriptions } from '@dxos/async';
import { invariant } from '@dxos/invariant';

import { Graph } from './graph';
import { type EdgeDirection, type NodeArg, type NodeBase } from './node';

export type ConnectorExtension = (params: {
  node: NodeBase;
  direction: EdgeDirection;
  type?: string;
}) => NodeArg<any>[];
export type HydratorExtension = (params: { id: string; type: string }) => NodeArg<any>;

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

export type GraphBuilderTraverseOptions = {
  node: NodeBase;
  direction?: EdgeDirection;
  visitor: (node: NodeBase, path: string[]) => void;
};

class BuilderInternal {
  static currentExtension?: string;
  static stateIndex?: number;
  static state: Record<string, any[]> = {};
  static cleanup: (() => void)[] = [];
}

// TODO(wittjosiah): Can multple effects ever run concurrently? Probably not, because they are not async.
export const memoize = <T>(fn: () => T, key = 'result'): T => {
  invariant(BuilderInternal.currentExtension, 'memoize must be called within an extension');
  invariant(BuilderInternal.stateIndex !== undefined, 'memoize must be called within an extension');
  const all = BuilderInternal.state[BuilderInternal.currentExtension][BuilderInternal.stateIndex] ?? {};
  const current = all[key];
  const result = current ? current.result : fn();
  BuilderInternal.state[BuilderInternal.currentExtension][BuilderInternal.stateIndex] = { ...all, [key]: { result } };
  BuilderInternal.stateIndex++;
  return result;
};

export const cleanup = (fn: () => void): void => {
  BuilderInternal.cleanup.push(fn);
};

export const toSignal = <T>(subscribe: (onChange: () => void) => () => void, get: () => T | undefined) => {
  const thisSignal = memoize(() => {
    return signal(get());
  });
  const unsubscribe = memoize(() => {
    return subscribe(() => (thisSignal.value = get()));
  });
  cleanup(() => {
    unsubscribe();
  });
  return thisSignal.value;
};

/**
 * The builder provides an extensible way to compose the construction of the graph.
 */
export class GraphBuilder {
  private readonly _extensions: Record<string, BuilderExtension> = {};
  private readonly _unsubscribe = new EventSubscriptions();
  private readonly _nodeChanged: Record<string, Signal<{}>> = {};

  /**
   * Register a node builder which will be called in order to construct the graph.
   */
  addExtension(id: string, extension: BuilderExtension): GraphBuilder {
    this._extensions[id] = extension;
    return this;
  }

  /**
   * Remove a node builder from the graph builder.
   */
  removeExtension(id: string): GraphBuilder {
    delete this._extensions[id];
    return this;
  }

  /**
   * Construct the graph, starting by calling all registered extensions.
   * @param previousGraph If provided, the graph will be updated in place.
   */
  build(previousGraph?: Graph): Graph {
    // Clear previous extension subscriptions.
    this._unsubscribe.clear();

    Object.keys(this._extensions).forEach((id) => {
      BuilderInternal.state[id] = [];
    });

    // TODO(wittjosiah): Handle more granular unsubscribing.
    //   - unsubscribe from removed nodes
    //   - add api for setting subscription set and/or radius.
    const graph: Graph =
      previousGraph ??
      new Graph({
        onInitialNode: (id, type) => {
          this._nodeChanged[id] = this._nodeChanged[id] ?? signal({});
          for (const hydrator of this._hydrators) {
            let node: NodeArg<any> | undefined;
            const unsubscribe = effect(() => {
              BuilderInternal.currentExtension = hydrator.id;
              BuilderInternal.stateIndex = 0;
              const maybeNode = hydrator.extension({ id, type });
              if (maybeNode) {
                node = maybeNode;
              }
              if (maybeNode && node) {
                graph._addNodes([node]);
                if (this._nodeChanged[node.id]) {
                  this._nodeChanged[node.id].value = {};
                }
              }
            });

            if (node) {
              this._unsubscribe.add(unsubscribe);
              return node;
            } else {
              unsubscribe();
            }
          }
        },
        onInitialNodes: (node, direction, type) => {
          this._nodeChanged[node.id] = this._nodeChanged[node.id] ?? signal({});
          let initial: NodeArg<any>[];
          let previous: string[] = [];
          this._unsubscribe.add(
            effect(() => {
              const _ = this._nodeChanged[node.id].value;
              const nodes: NodeArg<any>[] = [];
              for (const connector of this._connectors) {
                BuilderInternal.currentExtension = connector.id;
                BuilderInternal.stateIndex = 0;
                nodes.push(...connector.extension({ node, direction, type }));
              }
              const ids = nodes.map((n) => n.id);
              const removed = previous.filter((id) => !ids.includes(id));
              previous = ids;

              if (initial) {
                graph._removeNodes(removed, true);
                graph._addNodes(nodes);
                graph._addEdges(nodes.map(({ id }) => ({ source: node.id, target: id })));
                nodes.forEach((n) => {
                  if (this._nodeChanged[n.id]) {
                    this._nodeChanged[n.id].value = {};
                  }
                });
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
    BuilderInternal.cleanup.forEach((fn) => fn());
    this._unsubscribe.clear();
  }

  /**
   * Traverse a graph using just the connector extensions, without subscribing to any signals or persisting any nodes.
   */
  async traverse({ node, direction = 'outbound', visitor }: GraphBuilderTraverseOptions, path: string[] = []) {
    // Break cycles.
    if (path.includes(node.id)) {
      return;
    }

    // TODO(wittjosiah): Failed in test environment. ESM only?
    // await yieldOrContinue('idle');
    visitor(node, [...path, node.id]);

    const nodes = this._connectors
      .flatMap(({ extension }) => extension({ node, direction }))
      .map(
        (arg): NodeBase => ({
          id: arg.id,
          type: arg.type,
          data: arg.data ?? null,
          properties: arg.properties ?? {},
        }),
      );

    await Promise.all(nodes.map((n) => this.traverse({ node: n, direction, visitor }, [...path, node.id])));
  }

  private get _hydrators() {
    return Object.entries(this._extensions)
      .filter(([_, extension]) => extension.type === 'hydrator')
      .map(([id, { extension }]) => ({ id, extension: extension as HydratorExtension }));
  }

  private get _connectors() {
    return Object.entries(this._extensions)
      .filter(([_, extension]) => extension.type === 'connector')
      .map(([id, { extension }]) => ({ id, extension: extension as ConnectorExtension }));
  }
}
