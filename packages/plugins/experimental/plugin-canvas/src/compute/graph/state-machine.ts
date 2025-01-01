//
// Copyright 2024 DXOS.org
//

import { Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { S } from '@dxos/echo-schema';
import { type GraphNode } from '@dxos/graph';
import { invariant } from '@dxos/invariant';

import { type ComputeGraph, type AbstractComputeNode } from './compute-graph';

export const InvalidStateError = Error;

/**
 * Callback to notify the state machine of a scheduled update.
 */
export type AsyncUpdate<T> = (value: T) => void;

/**
 * Manages the dependency graph and async propagation of computed values.
 * Compute Nodes are invoked when all of their inputs are provided.
 * Root Nodes have a Void input type and are processed first.
 */
// TODO(burdon): Move to compute (wihout hyperformula dependency). Maps onto hyperformula as client runtime?
export class StateMachine {
  public readonly update = new Event<{ node: GraphNode<AbstractComputeNode<any, any>>; value: any }>();

  private _ctx?: Context;

  constructor(private readonly _graph: ComputeGraph) {}

  get isOpen() {
    return this._ctx !== undefined;
  }

  // TODO(burdon): Extend resource?
  async open() {
    if (this._ctx) {
      await this.close();
    }

    this._ctx = new Context();
    await Promise.all(
      this._graph.nodes.map(async (node) =>
        node.data.open(this._ctx, (output: any) => {
          if (!this._ctx) {
            return;
          }

          this.update.emit({ node, value: output });
          void this._propagate(node, output);
        }),
      ),
    );
  }

  async close() {
    if (this._ctx) {
      await this._ctx.dispose();
      this._ctx = undefined;
    }
  }

  async exec(node?: GraphNode<AbstractComputeNode<any, any>> | undefined) {
    if (node) {
      // Update root node.
      const output = await node.data.exec();
      this.update.emit({ node, value: output });
      void this._propagate(node, output);
    } else {
      // Fire root notes.
      for (const node of this._graph.nodes) {
        if (node.data.input === S.Void) {
          const output = await node.data.exec();
          this.update.emit({ node, value: output });
          void this._propagate(node, output);
        }
      }
    }
  }

  /**
   * Depth first propagation of compute events.
   */
  private async _propagate<T>(node: GraphNode<AbstractComputeNode<any, T>>, output: T) {
    for (const edge of this._graph.getEdges({ source: node.id })) {
      const target = this._graph.getNode(edge.target);
      invariant(target);
      target.data.setInput(edge.data?.property, output);
      if (target.data.output === S.Void) {
        this.update.emit({ node: target, value: output });
      } else {
        if (target.data.ready) {
          const output = await target.data.exec();
          this.update.emit({ node: target, value: output });
          void this._propagate(target, output);
        }
      }
    }
  }
}
