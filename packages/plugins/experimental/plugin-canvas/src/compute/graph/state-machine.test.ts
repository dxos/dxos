//
// Copyright 2024 DXOS.org
//

import { describe, test } from 'vitest';

import { Trigger } from '@dxos/async';
import { createEdgeId, type GraphNode } from '@dxos/graph';

import { createComputeGraph } from './compute-graph';
import { DEFAULT_INPUT, DEFAULT_OUTPUT, type ComputeNode } from './compute-node';
import { AndGate, Beacon, Switch } from './nodes';
import { StateMachine } from './state-machine';
import { createId } from '../../testing';
import { log } from '@dxos/log';

describe('state machine', () => {
  test('construct', async ({ expect }) => {
    const graph = createComputeGraph();

    // TODO(burdon): Builder pattern.
    const [a, b, c, d] = [
      { id: createId(), data: new Switch().setEnabled(false) },
      { id: createId(), data: new Switch().setEnabled(true) },
      { id: createId(), data: new AndGate() },
      { id: createId(), data: new Beacon() },
    ] as const;

    graph.addNode(a);
    graph.addNode(b);
    graph.addNode(c);
    graph.addNode(d);
    graph.addEdge({
      id: createEdgeId({ source: a.id, target: c.id, relation: 'invokes' }),
      source: a.id,
      target: c.id,
      data: { output: DEFAULT_OUTPUT, input: 'a' },
    });
    graph.addEdge({
      id: createEdgeId({ source: b.id, target: c.id, relation: 'invokes' }),
      source: b.id,
      target: c.id,
      data: { output: DEFAULT_OUTPUT, input: 'b' },
    });
    graph.addEdge({
      id: createEdgeId({ source: c.id, target: d.id, relation: 'invokes' }),
      source: c.id,
      target: d.id,
      data: { output: DEFAULT_OUTPUT, input: DEFAULT_INPUT },
    });

    const machine = new StateMachine(graph);
    await machine.open();
    expect(machine.isOpen).to.be.true;
    expect(c.data.input!.a).to.be.undefined;
    expect(c.data.input!.b).to.be.undefined;
    await machine.exec();

    // // TODO(burdon): Updating values should automatically trigger computation.
    a.data.setEnabled(true);
    await machine.exec(a);
    expect(d.data.input[DEFAULT_INPUT]).to.be.true;
    void machine.close();
  });
});
