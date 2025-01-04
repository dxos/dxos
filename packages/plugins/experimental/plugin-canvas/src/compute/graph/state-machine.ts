//
// Copyright 2024 DXOS.org
//

import { type LLMModel } from '@dxos/assistant';
import { Event } from '@dxos/async';
import { type Space } from '@dxos/client/echo';
import { Context } from '@dxos/context';
import { inspectCustom } from '@dxos/debug';
import { S } from '@dxos/echo-schema';
import { type GraphNode } from '@dxos/graph';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { type ComputeGraph, createComputeGraph } from './compute-graph';
import { type ComputeNode } from './compute-node';

export const InvalidStateError = Error;

/**
 * Callback to notify the state machine of a scheduled update.
 */
export type AsyncUpdate<T> = (value: T) => void;

export type StateMachineContext = {
  space?: Space;
  model?: LLMModel; // TODO(burdon): Evolve.
};

/**
 * Manages the dependency graph and async propagation of computed values.
 * Compute Nodes are invoked when all of their inputs are provided.
 * Root Nodes have a Void input type and are processed first.
 */
// TODO(burdon): Move to compute (without hyperformula dependency). Maps onto hyperformula as client runtime?
// TODO(burdon): Extend resource.
export class StateMachine {
  public readonly update = new Event<{ node: GraphNode<ComputeNode<any, any>>; value: any }>();

  private readonly _graph: ComputeGraph;

  private _ctx?: Context;

  constructor(graph?: ComputeGraph) {
    this._graph = graph ?? createComputeGraph();
  }

  [inspectCustom]() {
    return this.toJSON();
  }

  toString() {
    return `StateMachine({ nodes: ${this._graph.nodes.length} })`;
  }

  toJSON() {
    return {
      // TODO(burdon): Error if graph.toJSON.
      //  Converting circular structure to JSON --> starting at object with constructor 'Object' --- property 'native' closes the circle
      graph: {
        nodes: this._graph.nodes.length,
        edges: this._graph.edges.length,
      },
    };
  }

  get isOpen() {
    return this._ctx !== undefined;
  }

  get graph() {
    return this._graph;
  }

  // TODO(burdon): Clean this up.
  private _context?: Partial<StateMachineContext>;
  setContext(context?: Partial<StateMachineContext>): this {
    this._context = context;
    return this;
  }

  async open() {
    if (this._ctx) {
      await this.close();
    }

    log.info('opening...');
    this._ctx = new Context();
    await Promise.all(
      this._graph.nodes.map(async (node) => {
        await node.data.initialize(this._ctx, this._context, (output: any) => {
          if (!this._ctx) {
            log.warn('not running'); // TODO(burdon): Not displayed.
            return;
          }

          this.update.emit({ node, value: output });
          void this._propagate(node, output);
        });
      }),
    );
  }

  async close() {
    if (this._ctx) {
      log.info('closing...');
      await this._ctx.dispose();
      this._ctx = undefined;
    }
  }

  /**
   * Execute node and possibly recursive chain.
   */
  async exec(node?: GraphNode<ComputeNode<any, any>> | undefined) {
    if (node) {
      // Update root node.
      await this._exec(node);
    } else {
      // Fire root notes.
      for (const node of this._graph.nodes) {
        if (node.data.inputSchema === S.Void) {
          await this._exec(node);
        }
      }
    }
  }

  /**
   * Exec node and propagate output to downstream nodes.
   */
  private async _exec(node: GraphNode<ComputeNode<any, any>>) {
    if (node.data.outputSchema === S.Void) {
      return;
    }

    // TODO(burdon): Use inspect to stringify.
    log.info('exec', { node });
    const output = await node.data.exec();
    this.update.emit({ node, value: output });
    void this._propagate(node, output);
  }

  /**
   * Depth first propagation of compute events.
   */
  private async _propagate<T>(node: GraphNode<ComputeNode<any, T>>, output: T) {
    try {
      for (const edge of this._graph.getEdges({ source: node.id })) {
        const target = this._graph.getNode(edge.target);
        invariant(target, `invalid target: ${edge.target}`);

        // Get output.
        let value = output;
        if (edge.data?.output) {
          invariant(typeof output === 'object');
          value = (output as any)[edge.data?.output];
        }

        // Set input.
        const optional = target.data.setInput(edge.data?.input, value);

        // Check if ready.
        if (target.data.output === S.Void) {
          this.update.emit({ node: target, value: output });
        } else {
          // TODO(burdon): Don't fire if optional (breaks feedback loop). Need trigger props.
          if (!optional && target.data.ready) {
            await this._exec(target);
          }
        }
      }
    } catch (err) {
      log.catch(err);
      await this.close();
    }
  }
}
