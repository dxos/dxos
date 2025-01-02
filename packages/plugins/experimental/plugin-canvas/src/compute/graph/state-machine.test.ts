//
// Copyright 2024 DXOS.org
//

import { describe, test } from 'vitest';

import { Trigger } from '@dxos/async';
import { createEdgeId, type GraphNode } from '@dxos/graph';

import { createComputeGraph } from './compute-graph';
import { type ComputeNode } from './compute-node';
import { AndGate, Beacon, Switch } from './nodes';
import { StateMachine } from './state-machine';
import { createId } from '../../testing';

describe('state machine', () => {
  test('construct', async ({ expect }) => {
    const graph = createComputeGraph();

    // TODO(burdon): Builder pattern.
    const [a, b, c, d]: GraphNode<ComputeNode<any, any>>[] = [
      { id: createId(), data: new Switch().setOutput(false) },
      { id: createId(), data: new Switch().setOutput(true) },
      { id: createId(), data: new AndGate() },
      { id: createId(), data: new Beacon() },
    ];

    graph.addNode(a);
    graph.addNode(b);
    graph.addNode(c);
    graph.addNode(d);
    graph.addEdge({
      id: createEdgeId({ source: a.id, target: b.id, relation: 'invokes' }),
      source: a.id,
      target: c.id,
      data: { input: 'a' },
    });
    graph.addEdge({
      id: createEdgeId({ source: a.id, target: a.id, relation: 'invokes' }),
      source: b.id,
      target: c.id,
      data: { input: 'b' },
    });
    graph.addEdge({
      id: createEdgeId({ source: a.id, target: a.id, relation: 'invokes' }),
      source: c.id,
      target: d.id,
      data: undefined,
    });

    const machine = new StateMachine(graph);
    void machine.open();

    const done = new Trigger<boolean>();
    machine.update.on((ev) => {
      if (d.data.input.value === true) {
        done.wake(true);
      }
    });

    expect(c.data.input.value).to.be.undefined;
    void machine.exec();

    // TODO(burdon): Updating values should automatically trigger computation.
    a.data.setState(true);
    void machine.exec(a);

    await done.wait();
    expect(d.data.input.value).to.be.true;
    void machine.close();
  });
});
