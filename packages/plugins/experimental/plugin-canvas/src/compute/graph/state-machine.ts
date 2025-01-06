//
// Copyright 2024 DXOS.org
//

import { type LLMModel } from '@dxos/assistant';
import { Event } from '@dxos/async';
import { type Space } from '@dxos/client/echo';
import { Context, Resource } from '@dxos/context';
import { inspectCustom } from '@dxos/debug';
import { S } from '@dxos/echo-schema';
import { type GraphNode } from '@dxos/graph';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { type ComputeGraph, createComputeGraph } from './compute-graph';
import { type Binding, type ComputeNode } from './compute-node';
import type { FunctionCallback } from './nodes';
import type { GptInput, GptOutput } from '../shapes';

export const InvalidStateError = Error;

/**
 * Callback to notify the state machine of a scheduled update.
 */
export type AsyncUpdate<T> = (value: T) => void;

export type GptExecutor = FunctionCallback<GptInput, GptOutput>;

export type StateMachineContext = {
  space?: Space;
  gpt?: GptExecutor;
  model?: LLMModel; // TODO(burdon): Evolve.
};

/**
 * Manages the dependency graph and async propagation of computed values.
 * Compute Nodes are invoked when all of their inputs are provided.
 * Root Nodes have a Void input type and are processed first.
 */
// TODO(burdon): Move to compute (without hyperformula dependency). Maps onto hyperformula as client runtime?
// TODO(burdon): Extend Resource.
export class StateMachine extends Resource {
  private _autoRun = false;
  // TODO(dmaretskyi): Will be replaced by a sync function that does propagation.
  private _activeTasks: Promise<void>[] = [];

  public readonly update = new Event<{ node: GraphNode<ComputeNode<any, any>>; value: any }>();

  private readonly _graph: ComputeGraph;

  constructor(graph?: ComputeGraph) {
    super();
    this._graph = graph ?? createComputeGraph();
  }

  [inspectCustom]() {
    return this.toJSON();
  }

  override toString() {
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

  get graph() {
    return this._graph;
  }

  // TODO(burdon): Clean this up.
  private _context?: Partial<StateMachineContext>;
  setContext(context?: Partial<StateMachineContext>): this {
    this._context = context;
    return this;
  }

  setAutoRun(autoRun: boolean): this {
    this._autoRun = autoRun;
    return this;
  }

  protected override async _open(ctx: Context) {
    log.info('opening...');
    await Promise.all(
      this._graph.nodes.map(async (node) => {
        await node.data.initialize(this._ctx!, this._context!, (output: any) => {
          if (!this._ctx) {
            log.warn('not running'); // TODO(burdon): Not displayed.
            return;
          }

          if (this._autoRun) {
            this.update.emit({ node, value: output });
            void this._addToActiveTasks(() => this._propagate(node, output));
          }
        });
      }),
    );
  }

  protected override async _close(ctx: Context): Promise<void> {
    // noop
  }

  /**
   * Run all state updates until the graph state has settled.
   */
  async runToCompletion() {
    while (this._activeTasks.length > 0) {
      await Promise.all(this._activeTasks);
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
        if (node.data.getInputs().length === 0) {
          await this._exec(node);
        }
      }
    }

    await this.runToCompletion();
  }

  private async _addToActiveTasks(fn: () => Promise<void>) {
    const promise = fn()
      .catch((err) => {
        log.catch(err);
      })
      .finally(() => {
        const idx = this._activeTasks.indexOf(promise);
        if (idx !== -1) {
          this._activeTasks.splice(idx, 1);
        }
      });
    this._activeTasks.push(promise);
    return promise;
  }

  /**
   * Exec node and propagate output to downstream nodes.
   */
  private async _exec(node: GraphNode<ComputeNode<any, any>>) {
    if (node.data.getOutputs().length === 0) {
      return;
    }

    // TODO(burdon): Use inspect to stringify.
    log.info('exec', { node });
    const output = await node.data.exec();
    this.update.emit({ node, value: output });
    void this._addToActiveTasks(() => this._propagate(node, output));
  }

  /**
   * Depth first propagation of compute events.
   */
  private async _propagate<T extends Binding>(node: GraphNode<ComputeNode<any, T>>, output: T) {
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
        if (target.data.getOutputs().length === 0) {
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
