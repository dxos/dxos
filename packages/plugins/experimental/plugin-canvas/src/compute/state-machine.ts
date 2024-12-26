//
// Copyright 2024 DXOS.org
//

import { type GraphModel } from '@dxos/graph';
import { type ReactiveObject } from '@dxos/live-object';

// TODO(burdon): Extend resource.
// TODO(burdon): Move to compute (use hyperformula).
export class StateMachine {
  // TODO(burdon): Graph from canvas.
  // TODO(burdon): GraphNode<Shape<ComputeNode>> shape.object => compute node?
  constructor(private readonly _graph: GraphModel) {}

  start() {}
}

// TODO(burdon): Unit test.
// TODO(burdon): Create data structure.

export interface ComputeNode<Input, Output> {
  run(input: Input): Promise<Output>;
}

export class Subscription implements ComputeNode<void, ReactiveObject<any>[]> {
  async run() {
    return [];
  }
}

export class AndGate implements ComputeNode<boolean[], boolean> {
  async run(input: boolean[]) {
    return input.every((input) => input);
  }
}

export class RemoteFunction implements ComputeNode<object, object> {
  async run(input: object) {
    return input;
  }
}

export class TransformerFunction implements ComputeNode<string, string> {
  async run(input: string) {
    return input;
  }
}
