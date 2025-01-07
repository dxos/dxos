//
// Copyright 2024 DXOS.org
//

import { describe, test } from 'vitest';

import { createEdgeId } from '@dxos/graph';

import { createComputeGraph } from './compute-graph';
import { DEFAULT_INPUT, DEFAULT_OUTPUT } from './compute-node';
import { AndGate, Beacon, Switch } from './nodes';
import { StateMachine } from './state-machine';
import { createId } from '../../testing';

describe('state machine', () => {
  test('construct', async ({ expect }) => {
    const { graph, nodes } = createAndGateGraph();

    await using machine = await new StateMachine(graph).setAutoRun(true).open();
    expect(machine.isOpen).to.be.true;
    expect(nodes.c.data.input!.a).to.be.undefined;
    expect(nodes.c.data.input!.b).to.be.undefined;
    await machine.exec();

    nodes.a.data.setEnabled(true);
    await machine.runToCompletion();
    expect(nodes.d.data.input[DEFAULT_INPUT]).to.be.true;
    void machine.close();
  });
});

const createAndGateGraph = () => {
  const graph = createComputeGraph();
  const a = { id: createId(), data: new Switch().setEnabled(false) };
  const b = { id: createId(), data: new Switch().setEnabled(true) };
  const c = { id: createId(), data: new AndGate() };
  const d = { id: createId(), data: new Beacon() };
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

  return {
    graph,
    nodes: { a, b, c, d },
  };
};
